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

// Staff notification payloads
export interface NewOrderNotificationPayload {
  orderId: string;
  userId: string;
  order: any;
  message: string;
  timestamp: Date;
}

export interface OrderStatusUpdatedPayload {
  orderId: string;
  previousStatus: string;
  newStatus: string;
  message: string;
  timestamp: Date;
  updatedBy?: string; // staff ID who updated
  order?: any;
}
