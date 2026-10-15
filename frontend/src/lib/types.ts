export type TransactionStatus = 'paid' | 'pending' | 'partial'
export type TransactionType = 'expense' | 'income' | 'transfer'
export type ColumnType = 'number' | 'text' | 'select' | 'status' | 'date' | 'formula'
export type ColumnRole = 'payable' | 'paid' | 'remaining' | null
export type SheetKind = 'ledger' | 'table' | 'monthly_expenses' | 'calculator'
export type ThemeMode = 'night' | 'day'
export type AppView = 'schedule' | 'notes' | 'sheet' | 'profile' | 'settings' | 'admin' | 'dictionary'
export type NoteCheckMode = 'checkbox' | 'radio'
export type ShareRole = 'moderator' | 'viewer'
export type ShareStatus = 'pending' | 'accepted' | 'revoked'
export type ShareableType = 'note' | 'sheet'
export type PlatformRole = 'user' | 'admin'
export type UserPlan = 'free' | 'pro'

export interface PlanLimitsInfo {
  plan: UserPlan
  label: string
  max_sheets: number | null
  max_notes: number | null
  max_words: number | null
  can_share: boolean
  can_password_protect: boolean
  can_dictionary: boolean
  sheets_used: number
  notes_used: number
  words_used: number
}

export type SocialProvider = 'google' | 'facebook'

export interface User {
  id: number
  name: string
  email: string
  avatar_url: string | null
  has_password: boolean
  platform_role: PlatformRole
  plan: UserPlan
  is_admin: boolean
  /** Set while a Pro upgrade request awaits admin review. */
  pro_requested_at: string | null
  limits: PlanLimitsInfo
}

export interface AdminUser {
  id: number
  name: string
  email: string
  platform_role: PlatformRole
  plan: UserPlan
  blocked_at: string | null
  is_blocked: boolean
  pro_requested_at: string | null
  pro_request_note: string | null
  sheets_count: number
  notes_count: number
  created_at: string | null
}

export interface AdminStats {
  users: number
  blocked: number
  pro: number
  pending_pro: number
  admins: number
  sheets: number
  notes: number
}

export interface Account {
  id: number
  name: string
  currency: string
  opening_balance: string
  archived_at: string | null
  balance: string | null
}

export interface Category {
  id: number
  name: string
  color: string
  icon: string | null
}

export interface Sheet {
  id: number
  name: string
  slug: string
  kind: SheetKind
  position: number
  is_default: boolean
  budget: string | null
  reminders_enabled: boolean
  is_locked: boolean
  is_unlocked: boolean
  my_role?: ShareRole | 'owner' | 'none'
  is_owner?: boolean
}

export interface ResourceShare {
  id: number
  shareable_type: ShareableType
  shareable_id: number
  email: string
  role: ShareRole
  status: ShareStatus
  member_user_id: number | null
  member_name?: string | null
  invite_url?: string
  accepted_at: string | null
  expires_at: string | null
  created_at: string | null
}

export interface InvitePreview {
  token: string
  email: string
  role: ShareRole
  status: ShareStatus
  shareable_type: ShareableType
  shareable_id: number
  resource_title: string
  inviter_name: string
  expires_at: string | null
}

export interface CustomColumn {
  id: number
  sheet_id: number | null
  name: string
  slug: string
  type: ColumnType
  options: string[]
  formula: string | null
  role: ColumnRole
  summable: boolean
  position: number
}

export interface SheetRow {
  id: number
  sheet_id: number
  title: string | null
  values: Record<string, string | number | null>
  notes: string | null
  reminder_at: string | null
  reminder_sent_at: string | null
  year_month: string | null
  position: number
}

export interface RecurringTemplate {
  id: number
  label: string
  amount: string
  currency: string
  type: TransactionType
  default_status: TransactionStatus
  cadence: string
  is_active: boolean
  account_id: number | null
  category_id: number | null
}

export interface LedgerTransaction {
  id: number
  sheet_id?: number | null
  title: string
  type: TransactionType
  amount: string
  amount_paid: string
  remaining: string
  currency: string
  status: TransactionStatus
  occurred_on: string
  year_month: string
  notes: string | null
  custom_fields: Record<string, string | number | null>
  account_id: number | null
  category_id: number | null
  related_account_id: number | null
  template_id: number | null
  account?: Account | null
  category?: Category | null
}

export interface ParsedQuickEntry {
  amount: number | null
  currency: string | null
  status: TransactionStatus | null
  account_id: number | null
  account_name: string | null
  category_id: number | null
  category_name: string | null
  title: string | null
  raw: string
  unmatched: string[]
}

export interface MonthPayload {
  year_month: string
  rollover_created: number
  note: { id: number; year_month: string; body: string | null }
  totals: {
    expense_total: string
    expense_paid: string
    expense_remaining: string
    income_paid: string
  }
}

export interface DictionaryCategory {
  id: number
  name: string
}

export interface DictionaryWord {
  id: number
  english_word: string
  georgian_translation: string
  example_sentence_en: string | null
  example_sentence_ka: string | null
  categories: DictionaryCategory[]
  updated_at: string | null
}

export interface LaravelCollection<T> {
  data: T[]
}

export interface ScheduleTemplate {
  id: number
  name: string
  slug: string
  color: string
  position: number
}

export interface ScheduleBlock {
  id: number
  weekday: number
  start_time: string
  end_time: string
  title: string
  schedule_template_id: number | null
  notes: string | null
  position: number
  template?: ScheduleTemplate | null
}

export interface NoteItem {
  id: number
  note_id: number
  body: string
  checked: boolean
  position: number
}

export interface Note {
  id: number
  title: string
  check_mode: NoteCheckMode
  position: number
  is_locked: boolean
  is_unlocked: boolean
  my_role?: ShareRole | 'owner' | 'none'
  is_owner?: boolean
  items?: NoteItem[]
}
