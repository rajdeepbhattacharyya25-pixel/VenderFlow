# Email Notification Catalog

This document outlines the various email types supported by the VendorFlow marketplace, including their structure, branding guidelines, and message content.

## 1. Account & Security Emails

Mandatory for SaaS security and user verification.

### 📧 EMAIL_VERIFICATION
**Type:** `EMAIL_VERIFICATION`
**Subject:** Verify Your Email Address

**Message:**
Hi [Name],

Welcome to VendorFlow! To activate your account, please verify your email address by clicking the button below.

[Verify Email Button]

If you did not create this account, you can safely ignore this email.

**VendorFlow Team**

---

### 🔑 PASSWORD_RESET
**Type:** `PASSWORD_RESET`
**Subject:** Reset Your Password

**Message:**
Hi [Name],

We received a request to reset your VendorFlow password. You can set a new password using the link below.

[Reset Password Button]

If you did not request a password reset, please ignore this email.

**VendorFlow Security Team**

---

### 🔐 NEW_LOGIN_ALERT
**Type:** `NEW_LOGIN_ALERT`
**Subject:** New Login Detected

**Message:**
Hi [Name],

We detected a new login to your VendorFlow account.

- **Device:** [Device]
- **Location:** [Location]
- **Time:** [Time]

If this was you, no action is required. If you do not recognize this activity, please reset your password immediately.

**VendorFlow Security Team**

---

## 2. Seller Lifecycle Emails
Specific notifications for multi-vendor marketplace management.

### 🏪 SELLER_KYC_SUBMITTED
**Type:** `SELLER_KYC_SUBMITTED`
**Subject:** Your Seller Verification Is Under Review

**Message:**
Hi [Name],

Thank you for submitting your seller verification documents. Our team is currently reviewing your KYC details. This process usually takes 24–48 hours.

You will receive another email once your account is approved.

**VendorFlow Team**

---

### ✅ SELLER_KYC_APPROVED
**Type:** `SELLER_KYC_APPROVED`
**Subject:** Your Seller Account Has Been Approved 🎉

**Message:**
Hi [Name],

Congratulations! Your seller account has been successfully verified. You can now start listing products and receiving orders.

[Open Seller Dashboard]

Welcome to VendorFlow!

**VendorFlow Team**

---

### ❌ SELLER_KYC_REJECTED
**Type:** `SELLER_KYC_REJECTED`
**Subject:** Seller Verification Update

**Message:**
Hi [Name],

Unfortunately, we could not approve your seller verification at this time.

**Reason:** [Reason]

You can resubmit your documents from your seller dashboard.

[Resubmit Documents]

**VendorFlow Compliance Team**

---

## 3. Order Lifecycle Emails
Core transactional updates for customers.

### 🧾 ORDER_CONFIRMED
**Type:** `ORDER_CONFIRMED`
**Subject:** Your Order #[ID] Has Been Confirmed 🎉

**Message:**
Hi [Name],

Thank you for your order! We're happy to confirm that your purchase has been successfully placed.

**Order Details:**
- Order ID: #[ID]
- Total Amount: [Currency] [Total]

Our team is now preparing your order. You’ll receive another update as soon as it is packed and ready for shipment.

---

### 📦 ORDER_PACKED
**Type:** `ORDER_PACKED`
**Subject:** Good News! Your Order #[ID] Has Been Packed 📦

**Message:**
Hi [Name],

Great news! Your order #[ID] has been packed and is ready to be shipped. Our delivery partner will soon collect the package and begin the shipping process.

---

### 🛍️ ORDER_SHIPPED
**Type:** `ORDER_SHIPPED`
**Subject:** Your Order #[ID] Has Been Shipped

**Message:**
Hi [Name],

Your order #[ID] has been shipped and is on its way.

- **Courier:** [Courier Name]
- **Tracking Number:** [Tracking ID]

[Track Order Button]

**VendorFlow Team**

---

### 🚚 OUT_FOR_DELIVERY
**Type:** `OUT_FOR_DELIVERY`
**Subject:** Your Order #[ID] Is Out for Delivery 🚚

**Message:**
Hi [Name],

Your order #[ID] is out for delivery today. Our delivery partner will attempt to deliver the package shortly. Please keep your phone available.

---

### 📦 ORDER_DELIVERED
**Type:** `ORDER_DELIVERED`
**Subject:** Order #[ID] Delivered Successfully

**Message:**
Hi [Name],

Your order #[ID] has been successfully delivered. We hope you enjoy your purchase!

[Leave Review Button]

**VendorFlow Team**

---

### ❌ ORDER_CANCELLED
**Type:** `ORDER_CANCELLED`
**Subject:** Your Order #[ID] Has Been Cancelled

**Message:**
Hi [Name],

Your order #[ID] has been cancelled. If the payment was already processed, the refund will be initiated shortly.

If you did not request this cancellation, please contact our support team.

**VendorFlow Team**

---

## 4. Refund & Dispute Emails

### 💰 REFUND_INITIATED
**Type:** `REFUND_INITIATED`
**Subject:** Refund Initiated for Order #[ID]

**Message:**
Hi [Name],

Your refund request for order #[ID] has been successfully processed.

**Refund Amount:** [Currency] [Amount]

The amount will be credited back to your original payment method within 5–7 business days.

---

### ⚠️ DISPUTE_OPENED
**Type:** `DISPUTE_OPENED`
**Subject:** A Dispute Has Been Opened for Order #[ID]

**Message:**
Hi [Name],

A dispute has been opened regarding order #[ID]. Our support team will review the issue and work with both parties to resolve it as quickly as possible.

**VendorFlow Support**

---

### ⚖️ DISPUTE_RESOLVED
**Type:** `DISPUTE_RESOLVED`
**Subject:** Dispute Resolved for Order #[ID]

**Message:**
Hi [Name],

The dispute for order #[ID] has been resolved.

**Outcome:** [Resolution Details]

If a refund was issued, it will appear in your account within 5–7 business days.

**VendorFlow Support**

---

## 5. Seller Finance Emails

### 💸 SELLER_PAYOUT_SENT
**Type:** `SELLER_PAYOUT_SENT`
**Subject:** Your Payout Has Been Processed

**Message:**
Hi [Seller Name],

Your payout has been successfully processed.

- **Amount:** [Currency] [Amount]
- **Transfer ID:** [Transfer ID]

The amount should appear in your bank account shortly.

**VendorFlow Finance Team**

---

### ⏳ PAYOUT_ON_HOLD
**Type:** `PAYOUT_ON_HOLD`
**Subject:** Payout Temporarily On Hold

**Message:**
Hi [Seller Name],

Your payout is currently on hold due to an active dispute or review. Once the issue is resolved, the payout will be released automatically.

**VendorFlow Finance Team**

---

## 6. Platform Notifications

### 🎁 PROMOTION_AVAILABLE
**Type:** `PROMOTION_AVAILABLE`
**Subject:** Special Offer Just for You 🎉

**Message:**
Hi [Name],

We have a special promotion available for you. Use the offer before it expires and enjoy great savings.

[Shop Now Button]

**VendorFlow Team**

---

## Professional Structure & Variables

### Global Layout
1. **HEADER**: Logo, Store Name
2. **BODY**: User Context, Primary Message, CTA Button
3. **FOOTER**: Support Links, Branding, Unsubscribe

### Variable Map
- `{{customer_name}}`
- `{{order_id}}`
- `{{store_name}}`
- `{{order_total}}`
- `{{tracking_link}}`
- `{{support_email}}`
