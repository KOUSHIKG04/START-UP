declare module "react-native-razorpay" {
  const checkout: {
    open(options: {
      key: string;
      amount: number;
      currency: string;
      name: string;
      description: string;
      order_id: string;
      prefill?: { name?: string };
      theme: { color: string };
      retry?: { enabled: boolean; max_count: number };
    }): Promise<{
      razorpay_payment_id: string;
      razorpay_order_id: string;
      razorpay_signature: string;
    }>;
  };
  export default checkout;
}
