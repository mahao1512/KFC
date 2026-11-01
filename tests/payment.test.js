/**
 * ==============================================================================
 * BỘ KIỂM THỬ NGHIÊM NGẶT CHO MODULE THANH TOÁN (STRICT TEST SUITE)
 * ==============================================================================
 * Kiểm tra toàn diện mọi khía cạnh của KFCPaymentModule:
 *  - Nhóm 1: Xác thực dữ liệu đầu vào (Tên, SĐT Việt Nam, Địa chỉ, Thẻ ngân hàng)
 *  - Nhóm 2: Bộ máy tính toán chi phí (Tạm tính, Phí ship, Ngưỡng freeship, Voucher)
 *  - Nhóm 3: Các cổng thanh toán (COD, MoMo, VNPay, ZaloPay, Thẻ quốc tế 3D-Secure)
 *  - Nhóm 4: Tạo hóa đơn điện tử & Xử lý ngoại lệ biên (Edge cases)
 * ==============================================================================
 */

const KFCPayment = require('../js/payment.js');

// Test Runner Framework đơn giản, độc lập và nghiêm ngặt
let totalTests = 0;
let passedTests = 0;
let failedTests = 0;

function describe(suiteName, fn) {
  console.log(`\n======================================================`);
  console.log(`🧪 TEST SUITE: ${suiteName}`);
  console.log(`======================================================`);
  fn();
}

function it(testName, fn) {
  totalTests++;
  try {
    fn();
    passedTests++;
    console.log(`  ✅ [PASS] ${testName}`);
  } catch (err) {
    failedTests++;
    console.error(`  ❌ [FAIL] ${testName}`);
    console.error(`     Nguyên nhân: ${err.message}`);
  }
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message || 'Khẳng định kiểm thử không đạt (Assertion failed)');
  }
}

function assertEqual(actual, expected, message) {
  if (actual !== expected) {
    throw new Error(`${message || 'Giá trị không khớp'}: Mong đợi [${expected}], thực tế nhận [${actual}]`);
  }
}

// ==========================================
// THỰC THI BỘ TEST CASE
// ==========================================

describe('Nhóm 1: Kiểm thử Xác thực dữ liệu khách hàng & Thẻ', () => {

  it('1.1. validateRecipientName: Chấp nhận họ tên tiếng Việt hợp lệ', () => {
    const res1 = KFCPayment.validateRecipientName('Nguyễn Văn An');
    assert(res1.isValid === true, 'Họ tên chuẩn tiếng Việt phải hợp lệ');
    assertEqual(res1.value, 'Nguyễn Văn An');

    const res2 = KFCPayment.validateRecipientName('Trần Thị Mai-Phương');
    assert(res2.isValid === true, 'Họ tên có dấu nối phải hợp lệ');

    const res3 = KFCPayment.validateRecipientName('   Lê Hoàng Long   ');
    assertEqual(res3.value, 'Lê Hoàng Long', 'Cần tự động trim khoảng trắng thừa');
  });

  it('1.2. validateRecipientName: Từ chối tên quá ngắn, quá dài hoặc chứa ký tự độc hại', () => {
    assert(KFCPayment.validateRecipientName('').isValid === false, 'Không cho phép chuỗi rỗng');
    assert(KFCPayment.validateRecipientName('A').isValid === false, 'Tên 1 ký tự phải bị từ chối');
    assert(KFCPayment.validateRecipientName('<script>alert(1)</script>').isValid === false, 'Chặn XSS trong họ tên');
    assert(KFCPayment.validateRecipientName('Nguyễn Văn 123').isValid === false, 'Chặn số trong họ tên');
  });

  it('1.3. validateVietnamesePhone: Chấp nhận các đầu số di động chuẩn Việt Nam', () => {
    const validPhones = [
      '0912345678', // VinaPhone
      '0987654321', // Viettel
      '0901234567', // MobiFone
      '0381234567', // Viettel đầu mới
      '0791234567', // Mobi đầu mới
      '0561234567', // Vietnamobile
      '+84912345678' // Định dạng quốc tế
    ];
    validPhones.forEach(phone => {
      const res = KFCPayment.validateVietnamesePhone(phone);
      assert(res.isValid === true, `Số điện thoại [${phone}] phải được chấp nhận`);
    });
  });

  it('1.4. validateVietnamesePhone: Từ chối số điện thoại không hợp lệ hoặc sai độ dài', () => {
    const invalidPhones = [
      '',
      '0123456789', // Đầu 01 cũ 11 số không còn tồn tại
      '091234567',  // 9 số (thiếu số)
      '09123456789', // 11 số (thừa số)
      '02439741111', // Số máy bàn Hà Nội
      '0912abcxyz', // Chứa chữ cái
      'abcdefghij'
    ];
    invalidPhones.forEach(phone => {
      const res = KFCPayment.validateVietnamesePhone(phone);
      assert(res.isValid === false, `Số điện thoại sai [${phone}] phải bị từ chối`);
    });
  });

  it('1.5. validateDeliveryAddress: Kiểm tra độ dài địa chỉ hợp lệ', () => {
    assert(KFCPayment.validateDeliveryAddress('330 Nguyễn Thị Minh Khai, Q3').isValid === true);
    assert(KFCPayment.validateDeliveryAddress('Nhà').isValid === false, 'Địa chỉ quá ngắn phải bị từ chối');
    assert(KFCPayment.validateDeliveryAddress('').isValid === false, 'Địa chỉ rỗng phải bị từ chối');
  });

  it('1.6. validateLuhn & validateCardDetails: Kiểm tra thuật toán số thẻ ngân hàng', () => {
    // 4111111111111111 là thẻ Visa test chuẩn Luhn
    assert(KFCPayment.validateLuhn('4111111111111111') === true, 'Thẻ chuẩn Luhn phải hợp lệ');
    assert(KFCPayment.validateLuhn('4111111111111112') === false, 'Số thẻ sai số checksum phải bị từ chối');

    const validCard = {
      cardNumber: '4111111111111111',
      cardHolder: 'NGUYEN VAN AN',
      expiry: '12/28',
      cvv: '123'
    };
    const cardRes = KFCPayment.validateCardDetails(validCard);
    assert(cardRes.isValid === true, 'Thẻ đầy đủ thông tin hợp lệ phải pass');

    const expiredCard = { ...validCard, expiry: '01/20' };
    assert(KFCPayment.validateCardDetails(expiredCard).isValid === false, 'Thẻ hết hạn phải bị từ chối');
  });

});

describe('Nhóm 2: Kiểm thử Bộ máy tính toán chi phí (Pricing Engine)', () => {

  const sampleItems = [
    { id: '1', name: 'Combo Gà Rán Giòn', price: 89000, quantity: 1 },
    { id: '5', name: 'Khoai Tây Chiên Lớn', price: 35000, quantity: 1 }
  ]; // Subtotal = 124.000₫ (< 150.000₫)

  it('2.1. Đơn hàng dưới 150.000₫: Áp dụng phí giao hàng tiêu chuẩn 20.000₫', () => {
    const totals = KFCPayment.calculateTotals({ items: sampleItems });
    assertEqual(totals.subtotal, 124000, 'Tạm tính tiền món');
    assertEqual(totals.shippingFee, 20000, 'Phí ship chuẩn phải là 20.000₫');
    assertEqual(totals.isFreeShipping, false);
    assertEqual(totals.grandTotal, 144000, 'Tổng thanh toán = 124.000 + 20.000 = 144.000₫');
  });

  it('2.2. Đơn hàng từ 150.000₫ trở lên: Tự động Miễn phí giao hàng (0₫)', () => {
    const bigOrder = [
      { id: '4', name: 'Combo Nhóm Party', price: 199000, quantity: 1 }
    ]; // Subtotal = 199.000₫ (>= 150.000₫)
    const totals = KFCPayment.calculateTotals({ items: bigOrder });
    assertEqual(totals.subtotal, 199000);
    assertEqual(totals.shippingFee, 0, 'Phí ship phải là 0₫ khi đạt ngưỡng Freeship');
    assertEqual(totals.isFreeShipping, true);
    assertEqual(totals.grandTotal, 199000);
  });

  it('2.3. Tùy chọn Giao hỏa tốc (EXPRESS): Tính đúng phụ phí 15.000₫', () => {
    const totals = KFCPayment.calculateTotals({
      items: sampleItems,
      deliveryType: 'EXPRESS'
    });
    // Phí ship thường 20.000 + phụ phí 15.000 = 35.000₫
    assertEqual(totals.expressSurcharge, 15000);
    assertEqual(totals.shippingFee, 35000);
    assertEqual(totals.estimatedMinutes, 20, 'Giao hỏa tốc cam kết 20 phút');
  });

  it('2.4. Áp dụng Voucher KFCGIOL: Giảm 20% tối đa 40.000₫ khi đơn >= 150.000₫', () => {
    // Đơn 200.000₫ -> 20% là 40.000₫ (bằng maxDiscount)
    const items200k = [{ id: 'combo', name: 'Combo', price: 100000, quantity: 2 }];
    const totals = KFCPayment.calculateTotals({
      items: items200k,
      voucherCode: 'KFCGIOL'
    });
    assertEqual(totals.voucher.applied, true);
    assertEqual(totals.discountAmount, 40000, 'Giảm đúng trần 40.000₫');
    // Subtotal 200k, freeship 0k, giảm 40k -> GrandTotal = 160.000₫
    assertEqual(totals.grandTotal, 160000);
  });

  it('2.5. Từ chối Voucher KFCGIOL khi đơn chưa đạt 150.000₫', () => {
    const totals = KFCPayment.calculateTotals({
      items: sampleItems, // 124.000₫
      voucherCode: 'KFCGIOL'
    });
    assertEqual(totals.voucher.applied, false);
    assertEqual(totals.discountAmount, 0);
    assert(totals.voucher.message.includes('Còn thiếu'), 'Cần thông báo rõ số tiền còn thiếu');
  });

  it('2.6. Áp dụng Voucher FREESHIP: Miễn phí vận chuyển cho đơn từ 100.000₫', () => {
    const totals = KFCPayment.calculateTotals({
      items: sampleItems, // 124.000₫
      voucherCode: 'FREESHIP'
    });
    assertEqual(totals.voucher.applied, true);
    assertEqual(totals.shippingFee, 0, 'Phí ship phải về 0₫');
    assertEqual(totals.grandTotal, 124000);
  });

  it('2.7. Xử lý an toàn khi nhập mã voucher không tồn tại', () => {
    const totals = KFCPayment.calculateTotals({
      items: sampleItems,
      voucherCode: 'MABATKY123'
    });
    assertEqual(totals.voucher.applied, false);
    assertEqual(totals.discountAmount, 0);
    assertEqual(totals.grandTotal, 144000, 'Không làm hỏng tổng tiền');
  });

});

describe('Nhóm 3: Kiểm thử Các cổng thanh toán (Payment Gateways)', () => {

  const validCheckoutPayload = {
    cartItems: [
      { id: '1', name: 'Combo Gà Rán Giòn', price: 89000, quantity: 2 } // 178.000₫
    ],
    customerInfo: {
      name: 'Trần Hoàng Nam',
      phone: '0908123456',
      address: '123 Lê Lợi, Phường Bến Nghé, Quận 1',
      city: 'TP. Hồ Chí Minh',
      note: 'Giao lên tầng 4, bấm chuông'
    }
  };

  it('3.1. processPayment với Tiền mặt khi nhận hàng (COD)', () => {
    const result = KFCPayment.processPayment({
      ...validCheckoutPayload,
      paymentMethod: 'COD'
    });
    assert(result.success === true, 'Giao dịch COD phải thành công');
    assertEqual(result.receipt.payment.method, 'COD');
    assertEqual(result.receipt.status, 'PENDING_CASH');
    assert(result.receipt.orderId.startsWith('#KFC-'), 'Mã đơn phải có tiền tố #KFC-');
    assertEqual(result.receipt.totals.grandTotal, 178000);
  });

  it('3.2. processPayment với Ví điện tử MoMo (Sinh mã QR & Deep Link)', () => {
    const result = KFCPayment.processPayment({
      ...validCheckoutPayload,
      paymentMethod: 'MOMO'
    });
    assert(result.success === true);
    assertEqual(result.receipt.payment.method, 'MOMO');
    assert(result.receipt.payment.qrCodePayload.includes('0909688688'), 'Chứa chuỗi mã MoMo QR');
    assert(result.receipt.payment.deepLinkUrl.includes('momo://app'), 'Chứa URL mở ứng dụng MoMo');
  });

  it('3.3. processPayment với Cổng VNPAY-QR', () => {
    const result = KFCPayment.processPayment({
      ...validCheckoutPayload,
      paymentMethod: 'VNPAY'
    });
    assert(result.success === true);
    assertEqual(result.receipt.payment.method, 'VNPAY');
    assert(result.receipt.payment.qrCodePayload.startsWith('000201'), 'Đạt chuẩn VietQR VNPAY');
  });

  it('3.4. processPayment với Thẻ Quốc tế (Visa/Mastercard 3D-Secure)', () => {
    const result = KFCPayment.processPayment({
      ...validCheckoutPayload,
      paymentMethod: 'CARD',
      cardDetails: {
        cardNumber: '4111111111111111',
        cardHolder: 'TRAN HOANG NAM',
        expiry: '09/28',
        cvv: '888'
      }
    });
    assert(result.success === true, result.message);
    assertEqual(result.receipt.payment.method, 'CARD');
    assertEqual(result.receipt.status, 'AUTHORIZED_3D_SECURE');
    assertEqual(result.receipt.payment.details.maskedCardNumber, '**** **** **** 1111', 'Số thẻ phải được che mờ bảo mật');
  });

  it('3.5. processPayment từ chối khi thông tin thẻ bị sai', () => {
    const result = KFCPayment.processPayment({
      ...validCheckoutPayload,
      paymentMethod: 'CARD',
      cardDetails: {
        cardNumber: '11112222', // Sai độ dài, sai Luhn
        cardHolder: '',
        expiry: '01/20',
        cvv: 'abc'
      }
    });
    assert(result.success === false, 'Phải từ chối thẻ lỗi');
    assertEqual(result.errorCode, 'PAYMENT_GATEWAY_REJECTED');
  });

});

describe('Nhóm 4: Kiểm thử Xử lý Ngoại lệ & Biên lai giao dịch (Receipt & Edge Cases)', () => {

  it('4.1. Chặn thanh toán khi Giỏ hàng rỗng', () => {
    const result = KFCPayment.processPayment({
      cartItems: [],
      customerInfo: { name: 'Nam', phone: '0912345678', address: '123 Le Loi' },
      paymentMethod: 'COD'
    });
    assert(result.success === false);
    assertEqual(result.errorCode, 'EMPTY_CART');
  });

  it('4.2. Chặn thanh toán khi thiếu thông tin người nhận', () => {
    const result = KFCPayment.processPayment({
      cartItems: [{ id: '1', price: 89000, quantity: 1 }],
      customerInfo: { name: '', phone: 'sai-sdt', address: '' },
      paymentMethod: 'COD'
    });
    assert(result.success === false);
    assertEqual(result.errorCode, 'INVALID_CUSTOMER_INFO');
    assert(result.validationErrors.name !== undefined);
    assert(result.validationErrors.phone !== undefined);
    assert(result.validationErrors.address !== undefined);
  });

  it('4.3. Chặn phương thức thanh toán không được hỗ trợ', () => {
    const result = KFCPayment.processPayment({
      cartItems: [{ id: '1', price: 89000, quantity: 1 }],
      customerInfo: { name: 'Nam', phone: '0912345678', address: '123 Le Loi' },
      paymentMethod: 'BITCOIN_CRYPTO'
    });
    assert(result.success === false);
    assertEqual(result.errorCode, 'UNSUPPORTED_PAYMENT_METHOD');
  });

  it('4.4. Kiểm tra tính toàn vẹn của Hóa đơn điện tử (Receipt)', () => {
    const result = KFCPayment.processPayment({
      cartItems: [
        { id: '1', name: 'Combo Gà Rán Giòn', price: 89000, quantity: 2 }
      ],
      customerInfo: {
        name: 'Nguyễn Thị Bích',
        phone: '0938889999',
        address: '456 Hai Bà Trưng, Phường Đa Kao, Quận 1',
        city: 'TP. Hồ Chí Minh'
      },
      paymentMethod: 'COD'
    });

    const receipt = result.receipt;
    assert(receipt !== undefined, 'Hóa đơn phải được tạo');
    assert(receipt.orderId.length > 10, 'Mã hóa đơn phải chuẩn độ dài');
    assert(receipt.transactionId.length > 5, 'Có mã giao dịch');
    assertEqual(receipt.customer.name, 'Nguyễn Thị Bích');
    assertEqual(receipt.totals.grandTotal, 178000);
    assert(receipt.estimatedDeliveryTime !== undefined, 'Có mốc thời gian giao hàng dự kiến');
    assert(receipt.totals.formatted.grandTotal.includes('178.000'), 'Định dạng tiền tệ tiếng Việt');
  });

});

// ==========================================
// TỔNG KẾT KIỂM THỬ
// ==========================================
console.log(`\n======================================================`);
console.log(`📊 BÁO CÁO KẾT QUẢ KIỂM THỬ MODULE THANH TOÁN:`);
console.log(`   - Tổng số test cases: ${totalTests}`);
console.log(`   - Số test ĐẠT (PASS) : ${passedTests}`);
console.log(`   - Số test LỖI (FAIL) : ${failedTests}`);
console.log(`======================================================`);

if (failedTests > 0) {
  console.error(`💥 CÓ ${failedTests} TEST CASE THẤT BẠI!`);
  process.exit(1);
} else {
  console.log(`🎉 TẤT CẢ ${totalTests} TEST CASES ĐÃ VƯỢT QUA XUẤT SẮC 100%! KHÔNG CÓ LỖI PHÁT SINH.\n`);
  process.exit(0);
}
