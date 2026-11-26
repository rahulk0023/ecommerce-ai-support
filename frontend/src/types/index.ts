export interface User {
  id: number
  name: string
  email: string
  role: 'customer' | 'staff' | 'admin'
  created_at: string
}

export interface Order {
  id: number
  customer_id: number
  status: 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled' | 'returned'
  delivery_date: string | null
  total_amount: number
  item_category: string | null
  item_details: string | null
  created_at: string
}

export interface Ticket {
  id: number
  customer_id: number
  order_id: number | null
  subject: string
  description: string | null
  category: 'refund' | 'shipping' | 'product' | 'payment' | 'other'
  status: 'open' | 'in_progress' | 'pending_review' | 'resolved' | 'closed'
  priority: 'low' | 'medium' | 'high' | 'urgent'
  created_at: string
  updated_at: string | null
}

export interface Message {
  id: number
  ticket_id: number
  sender_type: 'customer' | 'agent' | 'staff' | 'system'
  sender_id: number | null
  content: string
  created_at: string
}

export interface Refund {
  id: number
  order_id: number
  ticket_id: number | null
  amount: number
  reason: string | null
  status: 'pending' | 'approved' | 'rejected' | 'escalated' | 'processed'
  requested_by: number
  reviewed_by: number | null
  created_at: string
  updated_at: string | null
}

export interface Escalation {
  id: number
  ticket_id: number
  summary: string
  priority: 'low' | 'medium' | 'high'
  assigned_to: number | null
  decision: 'pending' | 'approved' | 'rejected' | 'needs_info'
  internal_note: string | null
  created_at: string
  updated_at: string | null
}
