/**
 * Schéma de types PostgreSQL / Supabase pour Nexus POS Pro (v1.2.29).
 * Aligné avec TABLE_COLUMNS (src/lib/db-converters.ts) et les migrations SQL.
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      products: {
        Row: {
          id: string;
          name: string;
          barcode?: string | null;
          sku?: string | null;
          reference?: string | null;
          price: number;
          online_price?: number | null;
          cost_price?: number | null;
          wholesale_price?: number | null;
          tax_rate?: number | null;
          stock: number;
          min_stock?: number | null;
          category_id?: string | null;
          brand_id?: string | null;
          supplier?: string | null;
          unit?: string | null;
          status?: string | null;
          description?: string | null;
          is_bundle?: boolean | null;
          bundle_items?: Json | null;
          quantity_discounts?: Json | null;
          image_url?: string | null;
          image_urls?: Json | null;
          tags?: Json | null;
          expiration_date?: string | null;
          batch_number?: string | null;
          location?: string | null;
          show_in_pos?: boolean | null;
          damaged_stock?: number | null;
          use_multi_expiry?: boolean | null;
          batches?: Json | null;
          auto_unpack?: boolean | null;
          units_per_parent?: number | null;
          parent_id?: string | null;
          is_quick_select?: boolean | null;
          price_history?: Json | null;
          created_at?: string;
          updated_at?: string;
          [key: string]: any;
        };
        Insert: {
          id?: string;
          name?: string;
          price?: number;
          stock?: number;
          [key: string]: any;
        };
        Update: {
          [key: string]: any;
        };
      };
      customers: {
        Row: {
          id: string;
          name: string;
          phone?: string | null;
          email?: string | null;
          loyalty_points?: number;
          balance?: number;
          loyalty_card_number?: string | null;
          total_spent?: number;
          last_visit?: string | null;
          notes?: string | null;
          is_app_user?: boolean | null;
          password?: string | null;
          password_hash?: string | null;
          address?: string | null;
          latitude?: number | null;
          longitude?: number | null;
          maps_url?: string | null;
          credit_limit?: number | null;
          is_wholesale?: boolean | null;
          birthday?: string | null;
          purchase_count?: number | null;
          last_purchase_date?: string | null;
          favorite_items?: Json | null;
          alerts?: Json | null;
          cashier_notes?: Json | null;
          join_date?: string | null;
          created_at?: string;
          updated_at?: string;
          [key: string]: any;
        };
        Insert: {
          id?: string;
          name?: string;
          [key: string]: any;
        };
        Update: {
          [key: string]: any;
        };
      };
      transactions: {
        Row: {
          id: string;
          total: number;
          payment_method: string;
          delivery_method?: string | null;
          timestamp: string;
          user_id: string;
          customer_id?: string | null;
          customer_name?: string | null;
          cashier_id?: string | null;
          cashier_name?: string | null;
          employee_id?: string | null;
          employee_name?: string | null;
          amount_received?: number | null;
          amount_returned?: number | null;
          status?: string | null;
          promotion_id?: string | null;
          points_earned?: number | null;
          discount_amount?: number | null;
          points_discount?: number | null;
          balance_used?: number | null;
          voucher_discount?: number | null;
          is_wholesale?: boolean | null;
          online_order_id?: string | null;
          items: Json;
          audit_status?: string | null;
          audited_by?: string | null;
          audited_at?: string | null;
          audit_duration?: number | null;
          audit_note?: string | null;
          is_edited?: boolean | null;
          edited_at?: string | null;
          edited_by?: string | null;
          original_total?: number | null;
          terminal_id?: string | null;
          terminal_name?: string | null;
          created_at?: string;
          updated_at?: string;
          [key: string]: any;
        };
        Insert: {
          id?: string;
          total?: number;
          payment_method?: string;
          timestamp?: string;
          user_id?: string;
          items?: Json;
          [key: string]: any;
        };
        Update: {
          [key: string]: any;
        };
      };
      users: {
        Row: {
          id: string;
          uid: string;
          email: string;
          display_name: string;
          role: string;
          join_date?: string | null;
          password?: string | null;
          password_hash?: string | null;
          [key: string]: any;
        };
        Insert: {
          id?: string;
          uid?: string;
          email?: string;
          display_name?: string;
          role?: string;
          [key: string]: any;
        };
        Update: {
          [key: string]: any;
        };
      };
      employees: {
        Row: {
          id: string;
          name: string;
          role: string;
          phone?: string | null;
          email?: string | null;
          hire_date?: string | null;
          status?: string | null;
          is_clocked_in?: boolean | null;
          base_salary?: number | null;
          salary_type?: string | null;
          hourly_rate?: number | null;
          daily_rate?: number | null;
          id_card_recto_url?: string | null;
          id_card_verso_url?: string | null;
          contract_url?: string | null;
          digital_signature_url?: string | null;
          [key: string]: any;
        };
        Insert: {
          id?: string;
          name?: string;
          role?: string;
          [key: string]: any;
        };
        Update: {
          [key: string]: any;
        };
      };
      suppliers: {
        Row: {
          id: string;
          name: string;
          contact_name?: string | null;
          phone?: string | null;
          email?: string | null;
          address?: string | null;
          categories?: Json | null;
          feed_url?: string | null;
          feed_format?: string | null;
          last_sync?: string | null;
          sync_enabled?: boolean | null;
          is_app_user?: boolean | null;
          has_full_inventory_access?: boolean | null;
          balance?: number;
          pre_sale_days?: number | null;
          delivery_days?: Json | null;
          payment_days?: Json | null;
          planning_notes?: string | null;
          reminders?: Json | null;
          password_hash?: string | null;
          updated_at?: string;
          [key: string]: any;
        };
        Insert: {
          id?: string;
          name?: string;
          [key: string]: any;
        };
        Update: {
          [key: string]: any;
        };
      };
      online_orders: {
        Row: {
          id: string;
          external_order_id?: string | null;
          customer_id?: string | null;
          customer_name: string;
          customer_phone?: string | null;
          customer_email?: string | null;
          items: Json;
          subtotal?: number | null;
          total: number;
          status: string;
          payment_status: string;
          payment_method?: string | null;
          source?: string | null;
          delivery_method?: string | null;
          pickup_time?: string | null;
          shipping_address?: string | null;
          delivery_notes?: string | null;
          notes?: string | null;
          loyalty_points?: number | null;
          synced_to_pos?: boolean | null;
          assigned_employee_id?: string | null;
          assigned_employee_name?: string | null;
          assigned_picker_id?: string | null;
          assigned_picker_name?: string | null;
          status_history?: Json | null;
          latitude?: number | null;
          longitude?: number | null;
          maps_url?: string | null;
          gps_accuracy?: number | null;
          timestamp?: string;
          created_at?: string;
          updated_at?: string;
          [key: string]: any;
        };
        Insert: {
          id?: string;
          customer_name?: string;
          total?: number;
          [key: string]: any;
        };
        Update: {
          [key: string]: any;
        };
      };
      purchases: {
        Row: {
          id: string;
          supplier_id?: string | null;
          supplier_name?: string | null;
          items: Json;
          total_amount: number;
          status: string;
          invoice_number?: string | null;
          date: string;
          payment_status?: string | null;
          paid_amount?: number | null;
          global_discount?: number | null;
          global_tax?: number | null;
          notes?: string | null;
          documents?: Json | null;
          updated_at?: string;
          [key: string]: any;
        };
        Insert: {
          id?: string;
          total_amount?: number;
          [key: string]: any;
        };
        Update: {
          [key: string]: any;
        };
      };
      stock_adjustments: {
        Row: {
          id: string;
          product_id: string;
          new_quantity: number;
          adjustment: number;
          reason?: string | null;
          timestamp: string;
          user_id?: string | null;
          user_name?: string | null;
          is_loss?: boolean | null;
          created_at?: string;
          updated_at?: string;
          [key: string]: any;
        };
        Insert: {
          id?: string;
          product_id?: string;
          [key: string]: any;
        };
        Update: {
          [key: string]: any;
        };
      };
      customer_balance_adjustments: {
        Row: {
          idempotency_key: string;
          customer_id: string;
          delta_balance: number;
          delta_spent: number;
          delta_points: number;
          created_at?: string;
          [key: string]: any;
        };
        Insert: {
          idempotency_key: string;
          customer_id: string;
          delta_balance?: number;
          delta_spent?: number;
          delta_points?: number;
          [key: string]: any;
        };
        Update: {
          [key: string]: any;
        };
      };
      settings: {
        Row: {
          id: string;
          name: string;
          currency?: string | null;
          tax_rate?: number | null;
          [key: string]: any;
        };
        Insert: {
          id?: string;
          [key: string]: any;
        };
        Update: {
          [key: string]: any;
        };
      };
      cash_shifts: {
        Row: {
          id: string;
          opened_at: string;
          closed_at?: string | null;
          opened_by: string;
          closed_by?: string | null;
          initial_cash: number;
          final_cash?: number | null;
          expected_cash?: number | null;
          total_sales?: number | null;
          total_cash_sales?: number | null;
          total_card_sales?: number | null;
          total_expenses?: number | null;
          status: string;
          notes?: string | null;
          terminal_id?: string | null;
          terminal_name?: string | null;
          [key: string]: any;
        };
        Insert: {
          id?: string;
          [key: string]: any;
        };
        Update: {
          [key: string]: any;
        };
      };
      expenses: {
        Row: {
          id: string;
          description: string;
          amount: number;
          category?: string | null;
          date: string;
          user_id?: string | null;
          payment_method?: string | null;
          [key: string]: any;
        };
        Insert: {
          id?: string;
          [key: string]: any;
        };
        Update: {
          [key: string]: any;
        };
      };
      shortage_items: {
        Row: {
          id: string;
          product_id?: string | null;
          product_name: string;
          barcode?: string | null;
          sku?: string | null;
          current_stock?: number | null;
          min_stock?: number | null;
          desired_quantity?: number | null;
          unit?: string | null;
          supplier_id?: string | null;
          supplier_name?: string | null;
          category_id?: string | null;
          cost_price?: number | null;
          selling_price?: number | null;
          is_custom_product?: boolean | null;
          notes?: string | null;
          priority?: string | null;
          source: string;
          status: string;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
          [key: string]: any;
        };
        Insert: {
          id?: string;
          product_name?: string;
          [key: string]: any;
        };
        Update: {
          [key: string]: any;
        };
      };
      custom_replenishment_lists: {
        Row: {
          id: string;
          name: string;
          description?: string | null;
          color?: string | null;
          supplier_id?: string | null;
          supplier_name?: string | null;
          items: Json;
          status: string;
          notes?: string | null;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
          [key: string]: any;
        };
        Insert: {
          id?: string;
          name?: string;
          [key: string]: any;
        };
        Update: {
          [key: string]: any;
        };
      };
      [key: string]: {
        Row: Record<string, any>;
        Insert: Record<string, any>;
        Update: Record<string, any>;
      };
    };
    Views: {
      [key: string]: {
        Row: Record<string, any>;
      };
    };
    Functions: {
      adjust_customer_balance: {
        Args: {
          p_customer_id: string;
          p_delta_balance?: number;
          p_delta_spent?: number;
          p_delta_points?: number;
          p_idempotency_key?: string | null;
        };
        Returns: Json;
      };
      apply_stock_adjustment: {
        Args: {
          p_product_id: string;
          p_delta?: number;
          p_mode?: string;
          p_user_id?: string;
          p_user_name?: string;
          p_adjustment_id?: string;
        };
        Returns: Json;
      };
      is_admin: {
        Args: Record<string, any>;
        Returns: boolean;
      };
      [key: string]: {
        Args: Record<string, any>;
        Returns: any;
      };
    };
    Enums: {
      [key: string]: any;
    };
  };
}
