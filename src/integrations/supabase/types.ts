export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      cash_registers: {
        Row: {
          closed_at: string | null
          closed_by: string | null
          closing_balance: number | null
          id: string
          opened_at: string
          opened_by: string
          opening_balance: number
          store_id: string
          total_sales: number | null
        }
        Insert: {
          closed_at?: string | null
          closed_by?: string | null
          closing_balance?: number | null
          id?: string
          opened_at?: string
          opened_by: string
          opening_balance?: number
          store_id: string
          total_sales?: number | null
        }
        Update: {
          closed_at?: string | null
          closed_by?: string | null
          closing_balance?: number | null
          id?: string
          opened_at?: string
          opened_by?: string
          opening_balance?: number
          store_id?: string
          total_sales?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "cash_registers_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      categories: {
        Row: {
          created_at: string
          id: string
          image_url: string | null
          is_active: boolean
          name: Json
          sort_order: number | null
          store_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          image_url?: string | null
          is_active?: boolean
          name?: Json
          sort_order?: number | null
          store_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          image_url?: string | null
          is_active?: boolean
          name?: Json
          sort_order?: number | null
          store_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "categories_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      company_settings: {
        Row: {
          accent_color: string
          background_color: string
          banner_home_url: string | null
          button_style: string
          company_name: string
          created_at: string
          cta_color: string
          font_family: string | null
          icon_dine_in_url: string | null
          icon_takeaway_url: string | null
          id: string
          is_active: boolean
          logo_main_url: string | null
          logo_secondary_url: string | null
          primary_color: string
          secondary_color: string
          store_id: string
          text_color: string
          updated_at: string
        }
        Insert: {
          accent_color?: string
          background_color?: string
          banner_home_url?: string | null
          button_style?: string
          company_name?: string
          created_at?: string
          cta_color?: string
          font_family?: string | null
          icon_dine_in_url?: string | null
          icon_takeaway_url?: string | null
          id?: string
          is_active?: boolean
          logo_main_url?: string | null
          logo_secondary_url?: string | null
          primary_color?: string
          secondary_color?: string
          store_id: string
          text_color?: string
          updated_at?: string
        }
        Update: {
          accent_color?: string
          background_color?: string
          banner_home_url?: string | null
          button_style?: string
          company_name?: string
          created_at?: string
          cta_color?: string
          font_family?: string | null
          icon_dine_in_url?: string | null
          icon_takeaway_url?: string | null
          id?: string
          is_active?: boolean
          logo_main_url?: string | null
          logo_secondary_url?: string | null
          primary_color?: string
          secondary_color?: string
          store_id?: string
          text_color?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "company_settings_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: true
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      operations_settings: {
        Row: {
          avg_prep_minutes: number
          banner_enabled: boolean
          banner_interval_ms: number
          created_at: string
          id: string
          msg_counter: string
          msg_paid: string
          pay_apple_enabled: boolean
          pay_card_enabled: boolean
          pay_cash_enabled: boolean
          pay_counter_enabled: boolean
          pay_google_enabled: boolean
          pay_link_enabled: boolean
          pay_pix_enabled: boolean
          payment_mode: string
          store_id: string
          updated_at: string
        }
        Insert: {
          avg_prep_minutes?: number
          banner_enabled?: boolean
          banner_interval_ms?: number
          created_at?: string
          id?: string
          msg_counter?: string
          msg_paid?: string
          pay_apple_enabled?: boolean
          pay_card_enabled?: boolean
          pay_cash_enabled?: boolean
          pay_counter_enabled?: boolean
          pay_google_enabled?: boolean
          pay_link_enabled?: boolean
          pay_pix_enabled?: boolean
          payment_mode?: string
          store_id: string
          updated_at?: string
        }
        Update: {
          avg_prep_minutes?: number
          banner_enabled?: boolean
          banner_interval_ms?: number
          created_at?: string
          id?: string
          msg_counter?: string
          msg_paid?: string
          pay_apple_enabled?: boolean
          pay_card_enabled?: boolean
          pay_cash_enabled?: boolean
          pay_counter_enabled?: boolean
          pay_google_enabled?: boolean
          pay_link_enabled?: boolean
          pay_pix_enabled?: boolean
          payment_mode?: string
          store_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "operations_settings_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: true
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      order_items: {
        Row: {
          extras: Json | null
          id: string
          notes: string | null
          order_id: string
          product_id: string
          product_name: string
          quantity: number
          size_name: string | null
          total_price: number
          unit_price: number
        }
        Insert: {
          extras?: Json | null
          id?: string
          notes?: string | null
          order_id: string
          product_id: string
          product_name: string
          quantity?: number
          size_name?: string | null
          total_price: number
          unit_price: number
        }
        Update: {
          extras?: Json | null
          id?: string
          notes?: string | null
          order_id?: string
          product_id?: string
          product_name?: string
          quantity?: number
          size_name?: string | null
          total_price?: number
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          created_at: string
          customer_name: string | null
          customer_phone: string | null
          id: string
          notes: string | null
          order_number: string
          order_type: string | null
          payment_method: Database["public"]["Enums"]["payment_method"] | null
          source: Database["public"]["Enums"]["order_source"]
          status: Database["public"]["Enums"]["order_status"]
          store_id: string
          subtotal: number
          table_number: string | null
          total: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          customer_name?: string | null
          customer_phone?: string | null
          id?: string
          notes?: string | null
          order_number: string
          order_type?: string | null
          payment_method?: Database["public"]["Enums"]["payment_method"] | null
          source?: Database["public"]["Enums"]["order_source"]
          status?: Database["public"]["Enums"]["order_status"]
          store_id: string
          subtotal?: number
          table_number?: string | null
          total?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          customer_name?: string | null
          customer_phone?: string | null
          id?: string
          notes?: string | null
          order_number?: string
          order_type?: string | null
          payment_method?: Database["public"]["Enums"]["payment_method"] | null
          source?: Database["public"]["Enums"]["order_source"]
          status?: Database["public"]["Enums"]["order_status"]
          store_id?: string
          subtotal?: number
          table_number?: string | null
          total?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "orders_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      printer_category_map: {
        Row: {
          category_id: string
          id: string
          printer_id: string
        }
        Insert: {
          category_id: string
          id?: string
          printer_id: string
        }
        Update: {
          category_id?: string
          id?: string
          printer_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "printer_category_map_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "printer_category_map_printer_id_fkey"
            columns: ["printer_id"]
            isOneToOne: false
            referencedRelation: "printers"
            referencedColumns: ["id"]
          },
        ]
      }
      printer_settings: {
        Row: {
          agent_endpoint: string | null
          created_at: string
          enabled: boolean
          id: string
          ip_address: string | null
          last_test_at: string | null
          last_test_ok: boolean | null
          port: number
          printer_name: string
          store_id: string
          updated_at: string
        }
        Insert: {
          agent_endpoint?: string | null
          created_at?: string
          enabled?: boolean
          id?: string
          ip_address?: string | null
          last_test_at?: string | null
          last_test_ok?: boolean | null
          port?: number
          printer_name?: string
          store_id: string
          updated_at?: string
        }
        Update: {
          agent_endpoint?: string | null
          created_at?: string
          enabled?: boolean
          id?: string
          ip_address?: string | null
          last_test_at?: string | null
          last_test_ok?: boolean | null
          port?: number
          printer_name?: string
          store_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "printer_settings_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: true
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      printers: {
        Row: {
          created_at: string
          id: string
          ip_address: string | null
          is_active: boolean
          name: string
          port: number | null
          store_id: string
          type: string
        }
        Insert: {
          created_at?: string
          id?: string
          ip_address?: string | null
          is_active?: boolean
          name: string
          port?: number | null
          store_id: string
          type?: string
        }
        Update: {
          created_at?: string
          id?: string
          ip_address?: string | null
          is_active?: boolean
          name?: string
          port?: number | null
          store_id?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "printers_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      product_extras: {
        Row: {
          id: string
          max_qty: number | null
          name: Json
          price: number
          product_id: string
          sort_order: number | null
        }
        Insert: {
          id?: string
          max_qty?: number | null
          name?: Json
          price?: number
          product_id: string
          sort_order?: number | null
        }
        Update: {
          id?: string
          max_qty?: number | null
          name?: Json
          price?: number
          product_id?: string
          sort_order?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "product_extras_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      product_sizes: {
        Row: {
          id: string
          name: Json
          price_add: number
          product_id: string
          sort_order: number | null
        }
        Insert: {
          id?: string
          name?: Json
          price_add?: number
          product_id: string
          sort_order?: number | null
        }
        Update: {
          id?: string
          name?: Json
          price_add?: number
          product_id?: string
          sort_order?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "product_sizes_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      product_stock: {
        Row: {
          id: string
          product_id: string
          qty_per_unit: number
          stock_item_id: string
        }
        Insert: {
          id?: string
          product_id: string
          qty_per_unit?: number
          stock_item_id: string
        }
        Update: {
          id?: string
          product_id?: string
          qty_per_unit?: number
          stock_item_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_stock_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_stock_stock_item_id_fkey"
            columns: ["stock_item_id"]
            isOneToOne: false
            referencedRelation: "stock_items"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          category_id: string
          created_at: string
          description: Json | null
          id: string
          image_url: string | null
          is_active: boolean
          is_bestseller: boolean | null
          is_promo: boolean | null
          name: Json
          price: number
          sort_order: number | null
          store_id: string
          updated_at: string
        }
        Insert: {
          category_id: string
          created_at?: string
          description?: Json | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          is_bestseller?: boolean | null
          is_promo?: boolean | null
          name?: Json
          price?: number
          sort_order?: number | null
          store_id: string
          updated_at?: string
        }
        Update: {
          category_id?: string
          created_at?: string
          description?: Json | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          is_bestseller?: boolean | null
          is_promo?: boolean | null
          name?: Json
          price?: number
          sort_order?: number | null
          store_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "products_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          full_name: string | null
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      promo_banners: {
        Row: {
          created_at: string
          id: string
          image_url: string
          is_active: boolean
          link_url: string | null
          sort_order: number
          store_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          image_url: string
          is_active?: boolean
          link_url?: string | null
          sort_order?: number
          store_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          image_url?: string
          is_active?: boolean
          link_url?: string | null
          sort_order?: number
          store_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "promo_banners_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      stock_items: {
        Row: {
          created_at: string
          current_qty: number
          id: string
          min_qty: number | null
          name: string
          store_id: string
          unit: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          current_qty?: number
          id?: string
          min_qty?: number | null
          name: string
          store_id: string
          unit?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          current_qty?: number
          id?: string
          min_qty?: number | null
          name?: string
          store_id?: string
          unit?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "stock_items_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      stores: {
        Row: {
          address: string | null
          created_at: string
          id: string
          is_active: boolean
          name: string
          phone: string | null
          tenant_id: string
          updated_at: string
        }
        Insert: {
          address?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          phone?: string | null
          tenant_id: string
          updated_at?: string
        }
        Update: {
          address?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          phone?: string | null
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "stores_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tenants: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          logo_url: string | null
          max_orders_month: number | null
          name: string
          plan: string | null
          slug: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          logo_url?: string | null
          max_orders_month?: number | null
          name: string
          plan?: string | null
          slug: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          logo_url?: string | null
          max_orders_month?: number | null
          name?: string
          plan?: string | null
          slug?: string
          updated_at?: string
        }
        Relationships: []
      }
      totem_config: {
        Row: {
          accent_color: string | null
          active_languages: string[] | null
          bg_image_url: string | null
          created_at: string
          cta_color: string | null
          enable_dine_in: boolean | null
          enable_takeaway: boolean | null
          id: string
          logo_url: string | null
          primary_color: string | null
          secondary_color: string | null
          store_id: string
          updated_at: string
          welcome_message: Json | null
        }
        Insert: {
          accent_color?: string | null
          active_languages?: string[] | null
          bg_image_url?: string | null
          created_at?: string
          cta_color?: string | null
          enable_dine_in?: boolean | null
          enable_takeaway?: boolean | null
          id?: string
          logo_url?: string | null
          primary_color?: string | null
          secondary_color?: string | null
          store_id: string
          updated_at?: string
          welcome_message?: Json | null
        }
        Update: {
          accent_color?: string | null
          active_languages?: string[] | null
          bg_image_url?: string | null
          created_at?: string
          cta_color?: string | null
          enable_dine_in?: boolean | null
          enable_takeaway?: boolean | null
          id?: string
          logo_url?: string | null
          primary_color?: string | null
          secondary_color?: string | null
          store_id?: string
          updated_at?: string
          welcome_message?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "totem_config_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: true
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          store_id: string | null
          tenant_id: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          store_id?: string | null
          tenant_id?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          store_id?: string | null
          tenant_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_roles_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_hourly_sales: {
        Args: { _since: string; _store_id: string }
        Returns: {
          hour: number
          order_count: number
          revenue: number
        }[]
      }
      get_sales_summary: {
        Args: { _since: string; _store_id: string }
        Returns: {
          avg_ticket: number
          total_cancelled: number
          total_orders: number
          total_revenue: number
        }[]
      }
      get_top_products: {
        Args: { _limit?: number; _since: string; _store_id: string }
        Returns: {
          product_id: string
          product_name: string
          total_qty: number
          total_revenue: number
        }[]
      }
      get_user_tenant_id: { Args: { _user_id: string }; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin_master" | "restaurant_admin" | "operator" | "kitchen"
      order_source: "totem" | "ifood" | "counter" | "delivery"
      order_status:
        | "pending"
        | "preparing"
        | "ready"
        | "delivered"
        | "cancelled"
      payment_method: "card" | "cash" | "apple_pay" | "google_pay" | "pix"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin_master", "restaurant_admin", "operator", "kitchen"],
      order_source: ["totem", "ifood", "counter", "delivery"],
      order_status: ["pending", "preparing", "ready", "delivered", "cancelled"],
      payment_method: ["card", "cash", "apple_pay", "google_pay", "pix"],
    },
  },
} as const
