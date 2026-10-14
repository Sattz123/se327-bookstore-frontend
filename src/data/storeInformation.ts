export const storeContact = {
  address: 'Level 2, 45 King Street, Sydney NSW 2000, Australia',
  phone: '+1 800 555 123',
  telephone: '+1800555123',
  email: 'hello@inwzabookstore.com',
  hours: 'Monday–Friday, 9am–6pm',
  mapUrl:
    'https://www.google.com/maps/search/?api=1&query=45+King+Street+Sydney+NSW+2000+Australia',
  mapEmbed: 'https://maps.google.com/maps?q=45+King+Street+Sydney+NSW+2000+Australia&output=embed',
}

export const storeFaqs = [
  {
    question: 'Where can I see my order?',
    answer:
      'Sign in and open Orders to see your order history, saved delivery details, purchased books and current status. This demo shows order status in your account; it does not send shipping or tracking emails.',
    route: 'orders',
    link: 'View my orders',
  },
  {
    question: 'Can I change or cancel an order?',
    answer:
      'You can change items in your cart before checkout. After placing an order, contact the store with your order number. An administrator can cancel an order and return its quantities to stock. Customers cannot edit or cancel placed orders themselves.',
    route: 'contact',
    link: 'Contact the store',
  },
  {
    question: 'How do payments work?',
    answer:
      'Choose cash on delivery or a saved simulated card at checkout. Card payments are demonstrations: no money is charged. Save only the provider, cardholder name, last four digits and expiry date; do not enter a full card number or security code.',
    route: 'payment-methods',
    link: 'Manage payment methods',
  },
  {
    question: 'What are the delivery options and shipping rates?',
    answer:
      'Select a saved delivery address at checkout. The total is the sum of the book prices and quantities, with no additional shipping fee in this demo. Delivery speed, international shipping and parcel tracking are not selectable services.',
    route: 'addresses',
    link: 'Manage addresses',
  },
  {
    question: 'Can I return a book?',
    answer:
      'The original store describes returns within 30 days for books in their original condition. Contact the store with your order number to discuss a return. This demo has no online return request or money-refund service.',
    route: 'contact',
    link: 'Ask about a return',
  },
  {
    question: 'Does adding a book to my cart reserve it?',
    answer:
      'No. Stock is checked when you place the order. If stock or a price changes, review your cart again before trying checkout. Different formats of the same book share the displayed stock.',
    route: 'cart',
    link: 'Review my cart',
  },
  {
    question: 'How can I update my account or reset my password?',
    answer:
      'Open My Account to change your name, email, phone and password. If you cannot sign in, use Forgot password on the sign-in page. Changing saved account details does not rewrite the delivery details on an existing order.',
    route: 'profile',
    link: 'Open my account',
  },
]
