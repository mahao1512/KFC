/**
 * ==============================================================================
 * MODULE THANH TOÁN (PAYMENT & CHECKOUT MODULE) - KFC VIETNAM
 * ==============================================================================
 * Module thứ 2 trong hệ thống kiến trúc Vibe Coding / No-Backend.
 * Đảm nhiệm toàn bộ quy trình:
 *  1. Tiếp nhận và kiểm định dữ liệu từ Module Giỏ Hàng (Cart Items, Voucher, Subtotal).
 *  2. Tính toán tài chính chuẩn xác: Tạm tính, Phí ship, Khuyến mãi, Phí hỏa tốc, Tổng thanh toán.
 *  3. Xác thực biểu mẫu thông tin khách hàng (Chuẩn tên, SĐT Việt Nam, địa chỉ, thời gian giao).
 *  4. Xử lý các cổng thanh toán: Tiền mặt (COD), Ví MoMo, VNPAY-QR, ZaloPay, Thẻ tín dụng/ghi nợ.
 *  5. Sinh biên lai / hóa đơn điện tử độc nhất kèm mã QR thanh toán động.
 *  6. Độc lập, không phụ thuộc thư viện ngoài, tương thích cả Browser và Node.js.
 * ==============================================================================
 */

(function (root, factory) {
  if (typeof define === 'function' && define.amd) {
    define([], factory);
  } else if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.KFCPaymentModule = factory();
  }
}(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  // ==========================================
  // 1. CẤU HÌNH HỆ THỐNG THANH TOÁN
  // ==========================================
  const PAYMENT_CONFIG = {
    // Ngưỡng miễn phí vận chuyển mặc định (VND)
    FREE_SHIPPING_THRESHOLD: 150000,
    // Phí giao hàng tiêu chuẩn (VND)
    STANDARD_SHIPPING_FEE: 20000,
    // Phụ phí giao hỏa tốc (VND)
    EXPRESS_SURCHARGE: 15000,
    // Thời gian giao hàng cam kết (phút)
    STANDARD_DELIVERY_MINUTES: 30,
    EXPRESS_DELIVERY_MINUTES: 20,

    // Danh sách các mã giảm giá được cấu hình trong hệ thống
    VOUCHERS: {
      'KFCGIOL': {
        code: 'KFCGIOL',
        type: 'PERCENT',
        value: 20,              // 20%
        maxDiscount: 40000,     // Giảm tối đa 40.000₫
        minOrder: 150000,       // Đơn tối thiểu 150.000₫
        description: 'Giảm 20% tối đa 40.000₫ cho đơn hàng từ 150.000₫'
      },
      'FREESHIP': {
        code: 'FREESHIP',
        type: 'SHIPPING',
        value: 100,             // 100% phí giao hàng tiêu chuẩn
        maxDiscount: 20000,     // Tối đa 20.000₫
        minOrder: 100000,       // Đơn tối thiểu 100.000₫
        description: 'Miễn phí giao hàng tiêu chuẩn cho đơn từ 100.000₫'
      },
      'PARTY50': {
        code: 'PARTY50',
        type: 'FIXED',
        value: 50000,           // Giảm ngay 50.000₫
        maxDiscount: 50000,
        minOrder: 199000,       // Đơn tối thiểu 199.000₫
        description: 'Giảm ngay 50.000₫ trực tiếp cho đơn tiệc nhóm từ 199.000₫'
      },
      'KFCNEW': {
        code: 'KFCNEW',
        type: 'FIXED',
        value: 15000,           // Giảm 15.000₫
        maxDiscount: 15000,
        minOrder: 80000,        // Đơn tối thiểu 80.000₫
        description: 'Tặng 15.000₫ cho khách hàng mới với đơn từ 80.000₫'
      }
    },

    // Danh sách các phương thức thanh toán được hỗ trợ
    SUPPORTED_PAYMENT_METHODS: {
      'COD': {
        code: 'COD',
        name: 'Tiền mặt khi nhận hàng (COD)',
        icon: '💵',
        description: 'Thanh toán trực tiếp bằng tiền mặt cho tài xế khi nhận đồ ăn nóng sốt.'
      },
      'MOMO': {
        code: 'MOMO',
        name: 'Ví điện tử MoMo',
        icon: '👛',
        description: 'Quét mã MoMo-QR hoặc chuyển hướng ứng dụng MoMo chỉ với 1 chạm.'
      },
      'VNPAY': {
        code: 'VNPAY',
        name: 'VNPAY-QR / Thẻ ATM nội địa',
        icon: '🏦',
        description: 'Hỗ trợ quét QR qua hơn 40 ứng dụng ngân hàng tại Việt Nam.'
      },
      'ZALOPAY': {
        code: 'ZALOPAY',
        name: 'Ví điện tử ZaloPay',
        icon: '⚡',
        description: 'Thanh toán nhanh chóng, an toàn qua ví điện tử ZaloPay.'
      },
      'CARD': {
        code: 'CARD',
        name: 'Thẻ Quốc tế (Visa / Mastercard / JCB)',
        icon: '💳',
        description: 'Bảo mật tiêu chuẩn quốc tế với công nghệ xác thực 3D-Secure.'
      }
    }
  };

  // ==========================================
  // 2. CÁC HÀM TIỆN ÍCH & ĐỊNH DẠNG (HELPERS)
  // ==========================================

  /**
   * Định dạng số tiền sang chuẩn VND (Ví dụ: 89000 -> "89.000 ₫")
   * @param {number} amount
   * @returns {string}
   */
  function formatVND(amount) {
    const safeAmount = Math.max(0, Math.round(Number(amount) || 0));
    return safeAmount.toLocaleString('vi-VN') + ' ₫';
  }

  /**
   * Tạo mã đơn hàng độc nhất theo chuẩn KFC Việt Nam
   * Định dạng: #KFC-YYYYMMDD-XXXX (Ví dụ: #KFC-20261101-8392)
   * @returns {string}
   */
  function generateOrderId() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    return `#KFC-${year}${month}${day}-${randomSuffix}`;
  }

  /**
   * Che mờ số thẻ tín dụng (ví dụ: "4111111111111234" -> "**** **** **** 1234")
   * @param {string} cardNumber
   * @returns {string}
   */
  function maskCardNumber(cardNumber) {
    if (!cardNumber) return '****';
    const clean = String(cardNumber).replace(/\D/g, '');
    const last4 = clean.slice(-4);
    return `**** **** **** ${last4}`;
  }

  /**
   * Thuật toán Luhn (Mod 10) kiểm tra tính hợp lệ của số thẻ ngân hàng
   * @param {string} cardNumber
   * @returns {boolean}
   */
  function validateLuhn(cardNumber) {
    const digits = String(cardNumber).replace(/\D/g, '');
    if (digits.length < 13 || digits.length > 19) return false;

    let sum = 0;
    let shouldDouble = false;
    for (let i = digits.length - 1; i >= 0; i--) {
      let digit = parseInt(digits.charAt(i), 10);
      if (shouldDouble) {
        digit *= 2;
        if (digit > 9) digit -= 9;
      }
      sum += digit;
      shouldDouble = !shouldDouble;
    }
    return (sum % 10) === 0;
  }

  // ==========================================
  // 3. ENGINE XÁC THỰC THÔNG TIN (VALIDATION)
  // ==========================================

  /**
   * Xác thực họ và tên người nhận
   * - Không được rỗng
   * - Độ dài từ 2 đến 60 ký tự
   * - Hỗ trợ đầy đủ tiếng Việt có dấu
   */
  function validateRecipientName(name) {
    if (!name || typeof name !== 'string') {
      return { isValid: false, message: 'Họ và tên người nhận là bắt buộc.' };
    }
    const trimmed = name.trim();
    if (trimmed.length < 2) {
      return { isValid: false, message: 'Họ và tên quá ngắn (tối thiểu 2 ký tự).' };
    }
    if (trimmed.length > 60) {
      return { isValid: false, message: 'Họ và tên không được vượt quá 60 ký tự.' };
    }
    // Cho phép chữ cái tiếng Việt, khoảng trắng, dấu gạch nối, dấu nháy đơn
    const vietnameseNameRegex = /^[a-zA-ZÀ-ỹ\s'-]+$/u;
    if (!vietnameseNameRegex.test(trimmed)) {
      return { isValid: false, message: 'Họ và tên chỉ được chứa chữ cái và khoảng trắng.' };
    }
    return { isValid: true, value: trimmed };
  }

  /**
   * Xác thực số điện thoại di động Việt Nam
   * Hỗ trợ đầu số: 03, 05, 07, 08, 09 (10 chữ số) hoặc có tiền tố +84
   */
  function validateVietnamesePhone(phone) {
    if (!phone || typeof phone !== 'string') {
      return { isValid: false, message: 'Số điện thoại nhận hàng là bắt buộc.' };
    }
    const cleanPhone = phone.trim().replace(/\s+/g, '');
    // Regex chuẩn mạng viễn thông Việt Nam (Viettel, VinaPhone, MobiFone, Vietnamobile, Itelecom)
    const phoneRegex = /^(0|\+84)(3[2-9]|5[2689]|7[06-9]|8[1-9]|9[0-9])[0-9]{7}$/;
    if (!phoneRegex.test(cleanPhone)) {
      return {
        isValid: false,
        message: 'Số điện thoại không hợp lệ. Vui lòng nhập số điện thoại 10 số (ví dụ: 0912345678).'
      };
    }
    return { isValid: true, value: cleanPhone };
  }

  /**
   * Xác thực địa chỉ giao hàng
   */
  function validateDeliveryAddress(address) {
    if (!address || typeof address !== 'string') {
      return { isValid: false, message: 'Địa chỉ giao hàng là bắt buộc.' };
    }
    const trimmed = address.trim();
    if (trimmed.length < 6) {
      return { isValid: false, message: 'Địa chỉ giao hàng cần ghi rõ số nhà, tên đường (tối thiểu 6 ký tự).' };
    }
    if (trimmed.length > 250) {
      return { isValid: false, message: 'Địa chỉ giao hàng không được vượt quá 250 ký tự.' };
    }
    return { isValid: true, value: trimmed };
  }

  /**
   * Xác thực toàn bộ thông tin người nhận hàng
   * @param {Object} customerInfo
   * @returns {Object} { isValid: boolean, errors: Object, cleanData: Object }
   */
  function validateCustomerInfo(customerInfo) {
    const info = customerInfo || {};
    const errors = {};
    const cleanData = {};

    const nameCheck = validateRecipientName(info.name);
    if (!nameCheck.isValid) errors.name = nameCheck.message;
    else cleanData.name = nameCheck.value;

    const phoneCheck = validateVietnamesePhone(info.phone);
    if (!phoneCheck.isValid) errors.phone = phoneCheck.message;
    else cleanData.phone = phoneCheck.value;

    const addressCheck = validateDeliveryAddress(info.address);
    if (!addressCheck.isValid) errors.address = addressCheck.message;
    else cleanData.address = addressCheck.value;

    // Tỉnh / Thành phố
    cleanData.city = (info.city || 'TP. Hồ Chí Minh').trim();
    // Quận / Huyện
    cleanData.district = (info.district || '').trim();
    // Ghi chú giao hàng
    cleanData.note = (info.note || '').trim().slice(0, 200);
    // Thời gian giao: 'NOW' (giao ngay 30 phút) hoặc 'SCHEDULED'
    cleanData.deliveryOption = info.deliveryOption === 'EXPRESS' ? 'EXPRESS' : 'STANDARD';

    return {
      isValid: Object.keys(errors).length === 0,
      errors: errors,
      cleanData: cleanData
    };
  }

  /**
   * Xác thực chi tiết thẻ thanh toán quốc tế
   */
  function validateCardDetails(cardDetails) {
    const details = cardDetails || {};
    const errors = {};

    const cleanNumber = String(details.cardNumber || '').replace(/\D/g, '');
    if (!cleanNumber || !validateLuhn(cleanNumber)) {
      errors.cardNumber = 'Số thẻ không hợp lệ (không vượt qua kiểm tra thuật toán Luhn).';
    }

    const cardHolder = String(details.cardHolder || '').trim();
    if (!cardHolder || cardHolder.length < 2) {
      errors.cardHolder = 'Tên chủ thẻ không được để trống (viết hoa không dấu).';
    }

    const expiry = String(details.expiry || '').trim();
    const expiryMatch = expiry.match(/^(0[1-9]|1[0-2])\/([0-9]{2})$/);
    if (!expiryMatch) {
      errors.expiry = 'Hạn dùng thẻ không đúng định dạng MM/YY (ví dụ: 08/28).';
    } else {
      const expMonth = parseInt(expiryMatch[1], 10);
      const expYear = 2000 + parseInt(expiryMatch[2], 10);
      const now = new Date();
      const currentYear = now.getFullYear();
      const currentMonth = now.getMonth() + 1;
      if (expYear < currentYear || (expYear === currentYear && expMonth < currentMonth)) {
        errors.expiry = 'Thẻ đã hết hạn sử dụng.';
      }
    }

    const cvv = String(details.cvv || '').trim();
    if (!/^[0-9]{3,4}$/.test(cvv)) {
      errors.cvv = 'Mã bảo mật CVV/CVC phải gồm 3 hoặc 4 chữ số.';
    }

    return {
      isValid: Object.keys(errors).length === 0,
      errors: errors
    };
  }

  // ==========================================
  // 4. ENGINE TÍNH TOÁN TÀI CHÍNH (PRICING)
  // ==========================================

  /**
   * Tính toán toàn bộ chi phí đơn hàng từ giỏ hàng, voucher và phương thức giao
   * @param {Object} params
   * @param {Array} params.items - Danh sách món ăn từ Module Giỏ Hàng
   * @param {string} [params.voucherCode] - Mã voucher (nếu có)
   * @param {string} [params.deliveryType] - 'STANDARD' (mặc định) hoặc 'EXPRESS'
   * @returns {Object} Chi tiết tài chính đơn hàng
   */
  function calculateTotals(params) {
    const rawItems = (params && Array.isArray(params.items)) ? params.items : [];
    const voucherCode = (params && params.voucherCode) ? String(params.voucherCode).trim().toUpperCase() : null;
    const isExpress = (params && params.deliveryType === 'EXPRESS');

    // 1. Chuẩn hóa và lọc các món ăn hợp lệ
    const validItems = [];
    let subtotal = 0;
    let totalQuantity = 0;

    rawItems.forEach(item => {
      if (!item) return;
      const qty = parseInt(item.quantity || item.qty, 10) || 0;
      const price = Math.round(Number(item.price) || 0);

      if (qty > 0 && price >= 0) {
        const lineTotal = price * qty;
        subtotal += lineTotal;
        totalQuantity += qty;
        validItems.push({
          id: item.id || `item-${validItems.length + 1}`,
          name: item.name || 'Món KFC',
          price: price,
          quantity: qty,
          image_url: item.image_url || item.img || 'image/products/ga-ran.svg',
          lineTotal: lineTotal
        });
      }
    });

    // 2. Tính toán Phí giao hàng cơ bản
    const baseShippingFee = subtotal >= PAYMENT_CONFIG.FREE_SHIPPING_THRESHOLD ? 0 : PAYMENT_CONFIG.STANDARD_SHIPPING_FEE;
    const expressSurcharge = isExpress ? PAYMENT_CONFIG.EXPRESS_SURCHARGE : 0;
    let shippingFee = baseShippingFee + expressSurcharge;

    // 3. Xử lý Voucher Khuyến Mãi
    let voucherResult = {
      applied: false,
      code: voucherCode,
      discountAmount: 0,
      message: null
    };

    if (voucherCode) {
      const voucherDef = PAYMENT_CONFIG.VOUCHERS[voucherCode];
      if (!voucherDef) {
        voucherResult.message = `Mã giảm giá "${voucherCode}" không tồn tại hoặc đã hết hạn.`;
      } else if (subtotal < voucherDef.minOrder) {
        const diff = voucherDef.minOrder - subtotal;
        voucherResult.message = `Mã "${voucherCode}" yêu cầu đơn hàng tối thiểu ${formatVND(voucherDef.minOrder)} (Còn thiếu ${formatVND(diff)}).`;
      } else {
        // Hợp lệ, tính số tiền giảm
        let discount = 0;
        if (voucherDef.type === 'PERCENT') {
          discount = Math.round((subtotal * voucherDef.value) / 100);
          if (voucherDef.maxDiscount && discount > voucherDef.maxDiscount) {
            discount = voucherDef.maxDiscount;
          }
        } else if (voucherDef.type === 'FIXED') {
          discount = voucherDef.value;
        } else if (voucherDef.type === 'SHIPPING') {
          // Miễn phí vận chuyển
          discount = Math.min(baseShippingFee, voucherDef.maxDiscount || PAYMENT_CONFIG.STANDARD_SHIPPING_FEE);
          shippingFee = Math.max(0, shippingFee - discount);
        }

        // Đảm bảo không giảm vượt quá tiền hàng
        if (voucherDef.type !== 'SHIPPING') {
          discount = Math.min(subtotal, discount);
        }

        voucherResult.applied = true;
        voucherResult.discountAmount = discount;
        voucherResult.description = voucherDef.description;
        voucherResult.message = `Áp dụng thành công mã ${voucherCode}: Giảm ${formatVND(discount)}.`;
      }
    }

    // 4. Tổng thanh toán cuối cùng (Grand Total)
    const discountAmount = voucherResult.applied ? voucherResult.discountAmount : 0;
    // Với voucher shipping thì đã trừ thẳng vào shippingFee ở trên
    const finalDiscount = (voucherCode && PAYMENT_CONFIG.VOUCHERS[voucherCode] && PAYMENT_CONFIG.VOUCHERS[voucherCode].type === 'SHIPPING')
      ? 0
      : discountAmount;

    const grandTotal = Math.max(0, subtotal - finalDiscount + shippingFee);

    return {
      isValidOrder: validItems.length > 0 && subtotal > 0,
      itemCount: totalQuantity,
      itemTypesCount: validItems.length,
      items: validItems,
      subtotal: subtotal,
      baseShippingFee: baseShippingFee,
      expressSurcharge: expressSurcharge,
      shippingFee: shippingFee,
      isFreeShipping: baseShippingFee === 0,
      discountAmount: discountAmount,
      voucher: voucherResult,
      deliveryType: isExpress ? 'EXPRESS' : 'STANDARD',
      estimatedMinutes: isExpress ? PAYMENT_CONFIG.EXPRESS_DELIVERY_MINUTES : PAYMENT_CONFIG.STANDARD_DELIVERY_MINUTES,
      grandTotal: grandTotal,
      formatted: {
        subtotal: formatVND(subtotal),
        shippingFee: shippingFee === 0 ? '0 ₫ (Miễn phí)' : formatVND(shippingFee),
        discountAmount: discountAmount > 0 ? `-${formatVND(discountAmount)}` : '0 ₫',
        grandTotal: formatVND(grandTotal)
      }
    };
  }

  // ==========================================
  // 5. CỔNG THANH TOÁN & GIẢ LẬP GIAO DỊCH
  // ==========================================

  /**
   * Bộ điều phối xử lý từng phương thức thanh toán
   */
  const PaymentGateways = {
    /**
     * Thanh toán khi nhận hàng (Cash on delivery)
     */
    processCOD(orderPayload) {
      return {
        success: true,
        method: 'COD',
        transactionId: `COD-${Date.now()}`,
        status: 'PENDING_CASH',
        message: 'Đơn hàng đã được xác nhận thành công! Quý khách vui lòng chuẩn bị đúng số tiền mặt khi tài xế giao tới.',
        paymentDetails: {
          requireExactCash: orderPayload.totals.grandTotal,
          instructions: 'Kiểm tra hộp gà rán nguyên vẹn trước khi thanh toán cho tài xế.'
        }
      };
    },

    /**
     * Thanh toán qua Cổng MoMo (QR Code / Deep Link)
     */
    processMomo(orderPayload) {
      const orderId = orderPayload.orderId;
      const amount = orderPayload.totals.grandTotal;
      const transId = `MOMO-${Date.now()}`;

      // Chuỗi payload QR tiêu chuẩn MoMo Merchant / VietQR
      const qrPayload = `2|99|0909688688|KFC VIETNAM|cskh@kfc.vn|0|0|${amount}|${orderId}|transfer_myqr`;

      return {
        success: true,
        method: 'MOMO',
        transactionId: transId,
        status: 'PAID_MOMO_SIMULATED',
        qrCodePayload: qrPayload,
        deepLinkUrl: `momo://app?action=payWithApp&isScanQR=true&serviceType=qr&orderId=${orderId}&amount=${amount}`,
        message: 'Khởi tạo giao dịch MoMo thành công. Quét mã QR để hoàn tất thanh toán.',
        paymentDetails: {
          merchantName: 'KFC VIỆT NAM (FAST FOOD)',
          amountFormatted: formatVND(amount),
          qrExpiresInSeconds: 900 // 15 phút
        }
      };
    },

    /**
     * Thanh toán qua Cổng VNPAY-QR
     */
    processVNPay(orderPayload) {
      const orderId = orderPayload.orderId;
      const amount = orderPayload.totals.grandTotal;
      const transId = `VNPAY-${Date.now()}`;

      // Chuỗi chuẩn VietQR VNPAY
      const vnpayQrPayload = `00020101021238540010A000000727012400069704220110KFCVIETNAM0208QRIBFTTA5303704540${amount}5802VN62240820${orderId}6304`;

      return {
        success: true,
        method: 'VNPAY',
        transactionId: transId,
        status: 'PAID_VNPAY_SIMULATED',
        qrCodePayload: vnpayQrPayload,
        paymentUrl: `https://sandbox.vnpayment.vn/paymentv2/vpcpay.html?vnp_TxnRef=${orderId}&vnp_Amount=${amount * 100}`,
        message: 'Giao dịch VNPAY đã sẵn sàng. Mở ứng dụng ngân hàng để quét mã QR.',
        paymentDetails: {
          bankCode: 'VNPAYQR',
          orderInfo: `Thanh toan don hang KFC ${orderId}`,
          amountFormatted: formatVND(amount)
        }
      };
    },

    /**
     * Thanh toán qua Ví ZaloPay
     */
    processZaloPay(orderPayload) {
      const orderId = orderPayload.orderId;
      const amount = orderPayload.totals.grandTotal;
      const transId = `ZP-${Date.now()}`;

      return {
        success: true,
        method: 'ZALOPAY',
        transactionId: transId,
        status: 'PAID_ZALOPAY_SIMULATED',
        qrCodePayload: `https://qc.zalopay.vn/pay?app_id=123&app_trans_id=${transId}&amount=${amount}`,
        message: 'Tạo đơn hàng ZaloPay thành công.',
        paymentDetails: {
          amountFormatted: formatVND(amount),
          orderId: orderId
        }
      };
    },

    /**
     * Thanh toán bằng Thẻ quốc tế Visa / Mastercard (Đã qua xác thực 3D-Secure)
     */
    processCard(orderPayload, cardDetails) {
      const cardValidation = validateCardDetails(cardDetails);
      if (!cardValidation.isValid) {
        return {
          success: false,
          method: 'CARD',
          errors: cardValidation.errors,
          message: 'Thông tin thẻ tín dụng/ghi nợ không hợp lệ.'
        };
      }

      const cleanNumber = String(cardDetails.cardNumber).replace(/\D/g, '');
      const transId = `CARD-${Date.now()}`;

      return {
        success: true,
        method: 'CARD',
        transactionId: transId,
        status: 'AUTHORIZED_3D_SECURE',
        message: 'Xác thực thanh toán thẻ ngân hàng thành công qua 3D-Secure.',
        paymentDetails: {
          cardType: cleanNumber.startsWith('4') ? 'Visa' : 'Mastercard',
          maskedCardNumber: maskCardNumber(cleanNumber),
          cardHolder: cardDetails.cardHolder.toUpperCase(),
          amountFormatted: formatVND(orderPayload.totals.grandTotal)
        }
      };
    }
  };

  // ==========================================
  // 6. XỬ LÝ THANH TOÁN CHÍNH (MAIN PROCESSOR)
  // ==========================================

  /**
   * Hàm chính thực thi toàn bộ quy trình thanh toán của đơn hàng KFC
   * @param {Object} checkoutRequest
   * @param {Array} checkoutRequest.cartItems - Mảng các sản phẩm trong giỏ hàng
   * @param {Object} checkoutRequest.customerInfo - Thông tin người nhận
   * @param {string} checkoutRequest.paymentMethod - Mã cổng thanh toán (COD, MOMO, VNPAY, ZALOPAY, CARD)
   * @param {string} [checkoutRequest.voucherCode] - Mã giảm giá
   * @param {string} [checkoutRequest.deliveryType] - 'STANDARD' hoặc 'EXPRESS'
   * @param {Object} [checkoutRequest.cardDetails] - Thông tin thẻ (nếu chọn CARD)
   * @returns {Object} Kết quả xử lý đơn hàng & Biên lai (Receipt)
   */
  function processPayment(checkoutRequest) {
    const request = checkoutRequest || {};

    // Bước 1: Tính toán tài chính đơn hàng
    const totals = calculateTotals({
      items: request.cartItems,
      voucherCode: request.voucherCode,
      deliveryType: request.deliveryType
    });

    if (!totals.isValidOrder) {
      return {
        success: false,
        errorCode: 'EMPTY_CART',
        message: 'Giỏ hàng của bạn đang trống hoặc không có món ăn hợp lệ. Vui lòng chọn món trước khi thanh toán.'
      };
    }

    // Bước 2: Xác thực thông tin giao nhận
    const customerValidation = validateCustomerInfo(request.customerInfo);
    if (!customerValidation.isValid) {
      return {
        success: false,
        errorCode: 'INVALID_CUSTOMER_INFO',
        message: 'Vui lòng kiểm tra lại các trường thông tin giao hàng còn thiếu hoặc sai định dạng.',
        validationErrors: customerValidation.errors
      };
    }

    // Bước 3: Xác thực phương thức thanh toán
    const methodCode = (request.paymentMethod || 'COD').toUpperCase();
    const methodConfig = PAYMENT_CONFIG.SUPPORTED_PAYMENT_METHODS[methodCode];
    if (!methodConfig) {
      return {
        success: false,
        errorCode: 'UNSUPPORTED_PAYMENT_METHOD',
        message: `Phương thức thanh toán "${methodCode}" hiện không được hỗ trợ.`
      };
    }

    // Bước 4: Tạo định danh đơn hàng
    const orderId = generateOrderId();
    const createdAt = new Date().toISOString();

    const orderPayload = {
      orderId: orderId,
      createdAt: createdAt,
      totals: totals,
      customer: customerValidation.cleanData,
      paymentMethod: methodConfig
    };

    // Bước 5: Gọi cổng thanh toán tương ứng
    let gatewayResult;
    switch (methodCode) {
      case 'COD':
        gatewayResult = PaymentGateways.processCOD(orderPayload);
        break;
      case 'MOMO':
        gatewayResult = PaymentGateways.processMomo(orderPayload);
        break;
      case 'VNPAY':
        gatewayResult = PaymentGateways.processVNPay(orderPayload);
        break;
      case 'ZALOPAY':
        gatewayResult = PaymentGateways.processZaloPay(orderPayload);
        break;
      case 'CARD':
        gatewayResult = PaymentGateways.processCard(orderPayload, request.cardDetails);
        break;
      default:
        gatewayResult = { success: false, message: 'Cổng thanh toán không phản hồi.' };
    }

    if (!gatewayResult.success) {
      return {
        success: false,
        errorCode: 'PAYMENT_GATEWAY_REJECTED',
        message: gatewayResult.message,
        errors: gatewayResult.errors
      };
    }

    // Bước 6: Lập Hóa đơn điện tử / Biên lai giao dịch hoàn tất (Receipt)
    const estimatedDeliveryTime = new Date(Date.now() + totals.estimatedMinutes * 60000).toLocaleTimeString('vi-VN', {
      hour: '2-digit',
      minute: '2-digit'
    });

    const receipt = {
      orderId: orderId,
      transactionId: gatewayResult.transactionId,
      createdAt: createdAt,
      createdAtFormatted: new Date().toLocaleString('vi-VN'),
      estimatedDeliveryTime: estimatedDeliveryTime,
      estimatedMinutes: totals.estimatedMinutes,
      status: gatewayResult.status,
      customer: customerValidation.cleanData,
      items: totals.items,
      totals: {
        itemCount: totals.itemCount,
        subtotal: totals.subtotal,
        shippingFee: totals.shippingFee,
        discountAmount: totals.discountAmount,
        grandTotal: totals.grandTotal,
        formatted: totals.formatted
      },
      voucher: totals.voucher,
      payment: {
        method: methodCode,
        methodName: methodConfig.name,
        icon: methodConfig.icon,
        details: gatewayResult.paymentDetails || {},
        qrCodePayload: gatewayResult.qrCodePayload || null,
        deepLinkUrl: gatewayResult.deepLinkUrl || null
      }
    };

    return {
      success: true,
      orderId: orderId,
      receipt: receipt,
      message: 'Đặt hàng và khởi tạo thanh toán thành công!'
    };
  }

  // ==========================================
  // 7. CÁC HÀM XUẤT PUBLIC CỦA MODULE
  // ==========================================
  return {
    CONFIG: PAYMENT_CONFIG,
    formatVND: formatVND,
    generateOrderId: generateOrderId,
    maskCardNumber: maskCardNumber,
    validateLuhn: validateLuhn,
    validateRecipientName: validateRecipientName,
    validateVietnamesePhone: validateVietnamesePhone,
    validateDeliveryAddress: validateDeliveryAddress,
    validateCustomerInfo: validateCustomerInfo,
    validateCardDetails: validateCardDetails,
    calculateTotals: calculateTotals,
    processPayment: processPayment
  };
}));
