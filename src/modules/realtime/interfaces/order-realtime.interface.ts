export interface OrderProcessingPayload {
  jobId: string;
  message: string;
}

export interface OrderSuccessPayload {
  jobId: string;
  orderId: string;
  message: string;
  order: any;
}

export interface OrderErrorPayload {
  jobId: string;
  message: string;
  error: string;
}
