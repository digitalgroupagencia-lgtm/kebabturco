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
      ai_conversations: {
        Row: {
          created_at: string
          id: string
          tenant_id: string | null
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          tenant_id?: string | null
          title?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          tenant_id?: string | null
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_conversations_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_messages: {
        Row: {
          content: string
          conversation_id: string
          created_at: string
          id: string
          role: string
        }
        Insert: {
          content: string
          conversation_id: string
          created_at?: string
          id?: string
          role: string
        }
        Update: {
          content?: string
          conversation_id?: string
          created_at?: string
          id?: string
          role?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "ai_conversations"
            referencedColumns: ["id"]
          },
        ]
      }
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
          header_color: string
          icon_delivery_url: string | null
          icon_dine_in_url: string | null
          icon_takeaway_url: string | null
          id: string
          is_active: boolean
          logo_language_dark_url: string | null
          logo_language_url: string | null
          logo_main_dark_url: string | null
          logo_main_url: string | null
          logo_order_type_dark_url: string | null
          logo_order_type_url: string | null
          logo_secondary_dark_url: string | null
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
          header_color?: string
          icon_delivery_url?: string | null
          icon_dine_in_url?: string | null
          icon_takeaway_url?: string | null
          id?: string
          is_active?: boolean
          logo_language_dark_url?: string | null
          logo_language_url?: string | null
          logo_main_dark_url?: string | null
          logo_main_url?: string | null
          logo_order_type_dark_url?: string | null
          logo_order_type_url?: string | null
          logo_secondary_dark_url?: string | null
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
          header_color?: string
          icon_delivery_url?: string | null
          icon_dine_in_url?: string | null
          icon_takeaway_url?: string | null
          id?: string
          is_active?: boolean
          logo_language_dark_url?: string | null
          logo_language_url?: string | null
          logo_main_dark_url?: string | null
          logo_main_url?: string | null
          logo_order_type_dark_url?: string | null
          logo_order_type_url?: string | null
          logo_secondary_dark_url?: string | null
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
      delivery_zones: {
        Row: {
          created_at: string
          delivery_fee: number
          id: string
          is_active: boolean
          is_default: boolean
          min_order: number
          name: string
          postal_codes: string[] | null
          sort_order: number
          store_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          delivery_fee?: number
          id?: string
          is_active?: boolean
          is_default?: boolean
          min_order?: number
          name: string
          postal_codes?: string[] | null
          sort_order?: number
          store_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          delivery_fee?: number
          id?: string
          is_active?: boolean
          is_default?: boolean
          min_order?: number
          name?: string
          postal_codes?: string[] | null
          sort_order?: number
          store_id?: string
          updated_at?: string
        }
        Relationships: []
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
          require_phone_takeaway: boolean
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
          require_phone_takeaway?: boolean
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
          require_phone_takeaway?: boolean
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
          removed: Json
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
          removed?: Json
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
          removed?: Json
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
          seller_id: string | null
          source: Database["public"]["Enums"]["order_source"]
          status: Database["public"]["Enums"]["order_status"]
          store_id: string
          subtotal: number
          table_customer_id: string | null
          table_number: string | null
          table_session_id: string | null
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
          seller_id?: string | null
          source?: Database["public"]["Enums"]["order_source"]
          status?: Database["public"]["Enums"]["order_status"]
          store_id: string
          subtotal?: number
          table_customer_id?: string | null
          table_number?: string | null
          table_session_id?: string | null
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
          seller_id?: string | null
          source?: Database["public"]["Enums"]["order_source"]
          status?: Database["public"]["Enums"]["order_status"]
          store_id?: string
          subtotal?: number
          table_customer_id?: string | null
          table_number?: string | null
          table_session_id?: string | null
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
          {
            foreignKeyName: "orders_table_customer_id_fkey"
            columns: ["table_customer_id"]
            isOneToOne: false
            referencedRelation: "table_session_customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_table_session_id_fkey"
            columns: ["table_session_id"]
            isOneToOne: false
            referencedRelation: "table_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_history: {
        Row: {
          amount: number
          created_at: string
          created_by: string | null
          currency: string
          id: string
          method: string
          notes: string | null
          paid_at: string
          reference: string | null
          tenant_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          created_by?: string | null
          currency?: string
          id?: string
          method?: string
          notes?: string | null
          paid_at?: string
          reference?: string | null
          tenant_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          created_by?: string | null
          currency?: string
          id?: string
          method?: string
          notes?: string | null
          paid_at?: string
          reference?: string | null
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "payment_history_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      platform_settings: {
        Row: {
          ai_auto_images: boolean
          ai_auto_menu: boolean
          ai_image_style: string
          allow_signup: boolean
          created_at: string
          daily_summary: boolean
          default_currency: string
          default_language: string
          default_max_orders: number
          default_plan: string
          default_timezone: string
          email_notifications: boolean
          id: string
          maintenance_message: string
          maintenance_mode: boolean
          over_limit_alerts: boolean
          password_min_length: number
          platform_name: string
          require_2fa: boolean
          session_hours: number
          support_email: string
          trial_days: number
          updated_at: string
        }
        Insert: {
          ai_auto_images?: boolean
          ai_auto_menu?: boolean
          ai_image_style?: string
          allow_signup?: boolean
          created_at?: string
          daily_summary?: boolean
          default_currency?: string
          default_language?: string
          default_max_orders?: number
          default_plan?: string
          default_timezone?: string
          email_notifications?: boolean
          id?: string
          maintenance_message?: string
          maintenance_mode?: boolean
          over_limit_alerts?: boolean
          password_min_length?: number
          platform_name?: string
          require_2fa?: boolean
          session_hours?: number
          support_email?: string
          trial_days?: number
          updated_at?: string
        }
        Update: {
          ai_auto_images?: boolean
          ai_auto_menu?: boolean
          ai_image_style?: string
          allow_signup?: boolean
          created_at?: string
          daily_summary?: boolean
          default_currency?: string
          default_language?: string
          default_max_orders?: number
          default_plan?: string
          default_timezone?: string
          email_notifications?: boolean
          id?: string
          maintenance_message?: string
          maintenance_mode?: boolean
          over_limit_alerts?: boolean
          password_min_length?: number
          platform_name?: string
          require_2fa?: boolean
          session_hours?: number
          support_email?: string
          trial_days?: number
          updated_at?: string
        }
        Relationships: []
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
          image_url: string | null
          is_active: boolean
          link_url: string | null
          media_type: string
          sort_order: number
          store_id: string
          updated_at: string
          video_autoplay: boolean
          video_muted: boolean
          video_url: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          image_url?: string | null
          is_active?: boolean
          link_url?: string | null
          media_type?: string
          sort_order?: number
          store_id: string
          updated_at?: string
          video_autoplay?: boolean
          video_muted?: boolean
          video_url?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          image_url?: string | null
          is_active?: boolean
          link_url?: string | null
          media_type?: string
          sort_order?: number
          store_id?: string
          updated_at?: string
          video_autoplay?: boolean
          video_muted?: boolean
          video_url?: string | null
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
      splash_media: {
        Row: {
          created_at: string
          duration_ms: number
          id: string
          is_active: boolean
          media_type: string
          sort_order: number
          store_id: string
          updated_at: string
          url: string
        }
        Insert: {
          created_at?: string
          duration_ms?: number
          id?: string
          is_active?: boolean
          media_type?: string
          sort_order?: number
          store_id: string
          updated_at?: string
          url: string
        }
        Update: {
          created_at?: string
          duration_ms?: number
          id?: string
          is_active?: boolean
          media_type?: string
          sort_order?: number
          store_id?: string
          updated_at?: string
          url?: string
        }
        Relationships: []
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
          image_url: string | null
          is_active: boolean
          name: string
          phone: string | null
          short_description: string | null
          sort_order: number
          tenant_id: string
          updated_at: string
        }
        Insert: {
          address?: string | null
          created_at?: string
          id?: string
          image_url?: string | null
          is_active?: boolean
          name: string
          phone?: string | null
          short_description?: string | null
          sort_order?: number
          tenant_id: string
          updated_at?: string
        }
        Update: {
          address?: string | null
          created_at?: string
          id?: string
          image_url?: string | null
          is_active?: boolean
          name?: string
          phone?: string | null
          short_description?: string | null
          sort_order?: number
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
      table_session_customers: {
        Row: {
          closed_at: string | null
          closed_by: string | null
          created_at: string
          id: string
          name: string
          payment_method: string | null
          session_id: string
          status: string
          store_id: string
          total_amount: number
          updated_at: string
        }
        Insert: {
          closed_at?: string | null
          closed_by?: string | null
          created_at?: string
          id?: string
          name: string
          payment_method?: string | null
          session_id: string
          status?: string
          store_id: string
          total_amount?: number
          updated_at?: string
        }
        Update: {
          closed_at?: string | null
          closed_by?: string | null
          created_at?: string
          id?: string
          name?: string
          payment_method?: string | null
          session_id?: string
          status?: string
          store_id?: string
          total_amount?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "table_session_customers_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "table_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "table_session_customers_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      table_sessions: {
        Row: {
          closed_at: string | null
          closed_by: string | null
          created_at: string
          id: string
          opened_at: string
          opened_by: string | null
          payment_method: string | null
          payment_mode: string | null
          status: string
          store_id: string
          table_id: string | null
          table_number: string
          total_amount: number
          updated_at: string
        }
        Insert: {
          closed_at?: string | null
          closed_by?: string | null
          created_at?: string
          id?: string
          opened_at?: string
          opened_by?: string | null
          payment_method?: string | null
          payment_mode?: string | null
          status?: string
          store_id: string
          table_id?: string | null
          table_number: string
          total_amount?: number
          updated_at?: string
        }
        Update: {
          closed_at?: string | null
          closed_by?: string | null
          created_at?: string
          id?: string
          opened_at?: string
          opened_by?: string | null
          payment_method?: string | null
          payment_mode?: string | null
          status?: string
          store_id?: string
          table_id?: string | null
          table_number?: string
          total_amount?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "table_sessions_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "table_sessions_table_id_fkey"
            columns: ["table_id"]
            isOneToOne: false
            referencedRelation: "tables"
            referencedColumns: ["id"]
          },
        ]
      }
      tables: {
        Row: {
          capacity: number | null
          created_at: string
          id: string
          is_active: boolean
          number: string
          store_id: string
          updated_at: string
        }
        Insert: {
          capacity?: number | null
          created_at?: string
          id?: string
          is_active?: boolean
          number: string
          store_id: string
          updated_at?: string
        }
        Update: {
          capacity?: number | null
          created_at?: string
          id?: string
          is_active?: boolean
          number?: string
          store_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tables_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      tenant_subscriptions: {
        Row: {
          billing_day: number
          created_at: string
          currency: string
          extra_seller_price: number
          id: string
          last_payment_date: string | null
          monthly_amount: number
          next_due_date: string
          notes: string | null
          sellers_allowed: number
          sellers_included: number
          setup_fee: number
          status: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          billing_day?: number
          created_at?: string
          currency?: string
          extra_seller_price?: number
          id?: string
          last_payment_date?: string | null
          monthly_amount?: number
          next_due_date?: string
          notes?: string | null
          sellers_allowed?: number
          sellers_included?: number
          setup_fee?: number
          status?: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          billing_day?: number
          created_at?: string
          currency?: string
          extra_seller_price?: number
          id?: string
          last_payment_date?: string | null
          monthly_amount?: number
          next_due_date?: string
          notes?: string | null
          sellers_allowed?: number
          sellers_included?: number
          setup_fee?: number
          status?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tenant_subscriptions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: true
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tenants: {
        Row: {
          created_at: string
          custom_domain: string | null
          id: string
          is_active: boolean
          logo_url: string | null
          master_domain: string | null
          max_orders_month: number | null
          name: string
          path_slug: string | null
          plan: string | null
          slug: string
          updated_at: string
          use_master_domain: boolean
        }
        Insert: {
          created_at?: string
          custom_domain?: string | null
          id?: string
          is_active?: boolean
          logo_url?: string | null
          master_domain?: string | null
          max_orders_month?: number | null
          name: string
          path_slug?: string | null
          plan?: string | null
          slug: string
          updated_at?: string
          use_master_domain?: boolean
        }
        Update: {
          created_at?: string
          custom_domain?: string | null
          id?: string
          is_active?: boolean
          logo_url?: string | null
          master_domain?: string | null
          max_orders_month?: number | null
          name?: string
          path_slug?: string | null
          plan?: string | null
          slug?: string
          updated_at?: string
          use_master_domain?: boolean
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
          enable_delivery: boolean
          enable_dine_in: boolean | null
          enable_takeaway: boolean | null
          id: string
          language_icons: Json
          logo_url: string | null
          primary_color: string | null
          primary_language: string
          secondary_color: string | null
          splash_image_duration_ms: number
          splash_logo_dark_url: string | null
          splash_logo_url: string | null
          splash_show_text: boolean
          splash_subtitle: Json
          splash_title: Json
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
          enable_delivery?: boolean
          enable_dine_in?: boolean | null
          enable_takeaway?: boolean | null
          id?: string
          language_icons?: Json
          logo_url?: string | null
          primary_color?: string | null
          primary_language?: string
          secondary_color?: string | null
          splash_image_duration_ms?: number
          splash_logo_dark_url?: string | null
          splash_logo_url?: string | null
          splash_show_text?: boolean
          splash_subtitle?: Json
          splash_title?: Json
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
          enable_delivery?: boolean
          enable_dine_in?: boolean | null
          enable_takeaway?: boolean | null
          id?: string
          language_icons?: Json
          logo_url?: string | null
          primary_color?: string | null
          primary_language?: string
          secondary_color?: string | null
          splash_image_duration_ms?: number
          splash_logo_dark_url?: string | null
          splash_logo_url?: string | null
          splash_show_text?: boolean
          splash_subtitle?: Json
          splash_title?: Json
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
      add_or_get_table_customer: {
        Args: { _name: string; _session_id: string }
        Returns: string
      }
      close_table_customer: {
        Args: { _customer_id: string; _payment_method: string }
        Returns: Json
      }
      close_table_session_unified: {
        Args: { _payment_method: string; _session_id: string }
        Returns: Json
      }
      count_active_sellers: { Args: { _tenant_id: string }; Returns: number }
      create_seller_order: {
        Args: {
          _customer_name: string
          _items: Json
          _notes?: string
          _store_id: string
          _table_number: string
        }
        Returns: Json
      }
      duplicate_tenant: {
        Args: {
          _copy_banners?: boolean
          _copy_images?: boolean
          _copy_products?: boolean
          _new_name: string
          _new_slug: string
          _source_tenant_id: string
        }
        Returns: Json
      }
      get_admin_dashboard_stats: {
        Args: never
        Returns: {
          active_tenants: number
          mrr: number
          orders_today: number
          overdue_count: number
          paid_count: number
          pending_count: number
          revenue_month: number
          revenue_today: number
          total_tenants: number
        }[]
      }
      get_hourly_sales: {
        Args: { _since: string; _store_id: string }
        Returns: {
          hour: number
          order_count: number
          revenue: number
        }[]
      }
      get_monthly_revenue_series: {
        Args: never
        Returns: {
          month_date: string
          month_label: string
          order_count: number
          revenue: number
        }[]
      }
      get_orders_heatmap: {
        Args: never
        Returns: {
          day_of_week: number
          hour_of_day: number
          order_count: number
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
      get_seller_report: {
        Args: { _since: string; _store_id: string }
        Returns: {
          avg_ticket: number
          cancelled: number
          order_count: number
          revenue: number
          seller_id: string
          seller_name: string
        }[]
      }
      get_table_session_detail: {
        Args: { _session_id: string }
        Returns: {
          customer_id: string
          customer_name: string
          payment_method: string
          status: string
          total_amount: number
        }[]
      }
      get_tenant_billing: {
        Args: { _tenant_id: string }
        Returns: {
          currency: string
          extra_seller_price: number
          extra_sellers: number
          extra_total: number
          monthly_base: number
          monthly_total: number
          next_due_date: string
          sellers_active: number
          sellers_allowed: number
          sellers_included: number
          setup_fee: number
          status: string
        }[]
      }
      get_tenant_monthly_usage: {
        Args: { _tenant_id: string }
        Returns: {
          limit_max: number
          pct: number
          used: number
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
      get_top_tenants_by_revenue: {
        Args: { _limit?: number }
        Returns: {
          order_count: number
          tenant_id: string
          tenant_name: string
          total_revenue: number
        }[]
      }
      get_upcoming_payments: {
        Args: never
        Returns: {
          currency: string
          days_until_due: number
          monthly_amount: number
          next_due_date: string
          status: string
          tenant_id: string
          tenant_name: string
        }[]
      }
      get_user_store_id: { Args: { _user_id: string }; Returns: string }
      get_user_tenant_id: { Args: { _user_id: string }; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_seller: { Args: { _user_id: string }; Returns: boolean }
      is_tenant_over_limit: { Args: { _tenant_id: string }; Returns: boolean }
      next_order_number: { Args: { _store_id: string }; Returns: string }
      open_or_get_table_session: {
        Args: { _store_id: string; _table_number: string }
        Returns: string
      }
      reset_tenant_data: {
        Args: {
          _reset_banners?: boolean
          _reset_cash?: boolean
          _reset_categories?: boolean
          _reset_orders?: boolean
          _reset_products?: boolean
          _reset_stock?: boolean
          _tenant_id: string
        }
        Returns: Json
      }
    }
    Enums: {
      app_role:
        | "admin_master"
        | "restaurant_admin"
        | "operator"
        | "kitchen"
        | "seller"
      order_source: "totem" | "ifood" | "counter" | "delivery" | "waiter"
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
      app_role: [
        "admin_master",
        "restaurant_admin",
        "operator",
        "kitchen",
        "seller",
      ],
      order_source: ["totem", "ifood", "counter", "delivery", "waiter"],
      order_status: ["pending", "preparing", "ready", "delivered", "cancelled"],
      payment_method: ["card", "cash", "apple_pay", "google_pay", "pix"],
    },
  },
} as const
