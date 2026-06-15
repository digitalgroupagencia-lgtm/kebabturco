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
      _template_version: {
        Row: {
          applied_at: string
          codename: string | null
          id: boolean
          notes: string | null
          version: string
        }
        Insert: {
          applied_at?: string
          codename?: string | null
          id?: boolean
          notes?: string | null
          version: string
        }
        Update: {
          applied_at?: string
          codename?: string | null
          id?: boolean
          notes?: string | null
          version?: string
        }
        Relationships: []
      }
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
          {
            foreignKeyName: "cash_registers_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores_public"
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
          {
            foreignKeyName: "categories_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores_public"
            referencedColumns: ["id"]
          },
        ]
      }
      company_settings: {
        Row: {
          accent_color: string
          apple_touch_icon_url: string | null
          background_color: string
          banner_home_url: string | null
          button_style: string
          company_name: string
          created_at: string
          cta_color: string
          favicon_url: string | null
          font_family: string | null
          header_color: string
          icon_192_url: string | null
          icon_512_url: string | null
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
          meta_description: string | null
          og_image_url: string | null
          primary_color: string
          secondary_color: string
          short_name: string | null
          store_id: string
          text_color: string
          updated_at: string
        }
        Insert: {
          accent_color?: string
          apple_touch_icon_url?: string | null
          background_color?: string
          banner_home_url?: string | null
          button_style?: string
          company_name?: string
          created_at?: string
          cta_color?: string
          favicon_url?: string | null
          font_family?: string | null
          header_color?: string
          icon_192_url?: string | null
          icon_512_url?: string | null
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
          meta_description?: string | null
          og_image_url?: string | null
          primary_color?: string
          secondary_color?: string
          short_name?: string | null
          store_id: string
          text_color?: string
          updated_at?: string
        }
        Update: {
          accent_color?: string
          apple_touch_icon_url?: string | null
          background_color?: string
          banner_home_url?: string | null
          button_style?: string
          company_name?: string
          created_at?: string
          cta_color?: string
          favicon_url?: string | null
          font_family?: string | null
          header_color?: string
          icon_192_url?: string | null
          icon_512_url?: string | null
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
          meta_description?: string | null
          og_image_url?: string | null
          primary_color?: string
          secondary_color?: string
          short_name?: string | null
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
          {
            foreignKeyName: "company_settings_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: true
            referencedRelation: "stores_public"
            referencedColumns: ["id"]
          },
        ]
      }
      coupon_redemptions: {
        Row: {
          coupon_id: string
          created_at: string
          customer_phone: string | null
          discount_amount: number
          id: string
          order_id: string
        }
        Insert: {
          coupon_id: string
          created_at?: string
          customer_phone?: string | null
          discount_amount: number
          id?: string
          order_id: string
        }
        Update: {
          coupon_id?: string
          created_at?: string
          customer_phone?: string | null
          discount_amount?: number
          id?: string
          order_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "coupon_redemptions_coupon_id_fkey"
            columns: ["coupon_id"]
            isOneToOne: false
            referencedRelation: "coupons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coupon_redemptions_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      coupons: {
        Row: {
          code: string
          created_at: string
          description: string | null
          discount_type: string
          discount_value: number
          expires_at: string | null
          id: string
          is_active: boolean
          max_uses: number | null
          min_order: number
          store_id: string
          uses_count: number
        }
        Insert: {
          code: string
          created_at?: string
          description?: string | null
          discount_type: string
          discount_value: number
          expires_at?: string | null
          id?: string
          is_active?: boolean
          max_uses?: number | null
          min_order?: number
          store_id: string
          uses_count?: number
        }
        Update: {
          code?: string
          created_at?: string
          description?: string | null
          discount_type?: string
          discount_value?: number
          expires_at?: string | null
          id?: string
          is_active?: boolean
          max_uses?: number | null
          min_order?: number
          store_id?: string
          uses_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "coupons_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coupons_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores_public"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_saved_profiles: {
        Row: {
          delivery: Json
          name: string | null
          phone: string
          store_id: string
          updated_at: string
        }
        Insert: {
          delivery?: Json
          name?: string | null
          phone: string
          store_id: string
          updated_at?: string
        }
        Update: {
          delivery?: Json
          name?: string | null
          phone?: string
          store_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "customer_saved_profiles_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_saved_profiles_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores_public"
            referencedColumns: ["id"]
          },
        ]
      }
      customers: {
        Row: {
          created_at: string
          id: string
          name: string | null
          phone: string
          store_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          name?: string | null
          phone: string
          store_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string | null
          phone?: string
          store_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "customers_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customers_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores_public"
            referencedColumns: ["id"]
          },
        ]
      }
      delivery_zones: {
        Row: {
          city_names: string[] | null
          created_at: string
          delivery_fee: number
          id: string
          is_active: boolean
          is_default: boolean
          max_distance_km: number | null
          min_distance_km: number | null
          min_order: number
          name: string
          postal_codes: string[] | null
          sort_order: number
          store_id: string
          updated_at: string
        }
        Insert: {
          city_names?: string[] | null
          created_at?: string
          delivery_fee?: number
          id?: string
          is_active?: boolean
          is_default?: boolean
          max_distance_km?: number | null
          min_distance_km?: number | null
          min_order?: number
          name: string
          postal_codes?: string[] | null
          sort_order?: number
          store_id: string
          updated_at?: string
        }
        Update: {
          city_names?: string[] | null
          created_at?: string
          delivery_fee?: number
          id?: string
          is_active?: boolean
          is_default?: boolean
          max_distance_km?: number | null
          min_distance_km?: number | null
          min_order?: number
          name?: string
          postal_codes?: string[] | null
          sort_order?: number
          store_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      loyalty_accounts: {
        Row: {
          created_at: string
          customer_id: string | null
          id: string
          phone: string
          rewards_redeemed: number
          stamps: number
          store_id: string
          total_orders: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          customer_id?: string | null
          id?: string
          phone: string
          rewards_redeemed?: number
          stamps?: number
          store_id: string
          total_orders?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          customer_id?: string | null
          id?: string
          phone?: string
          rewards_redeemed?: number
          stamps?: number
          store_id?: string
          total_orders?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "loyalty_accounts_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "loyalty_accounts_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "loyalty_accounts_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores_public"
            referencedColumns: ["id"]
          },
        ]
      }
      marketing_campaigns: {
        Row: {
          campaign_type: string
          created_at: string
          id: string
          is_active: boolean
          message_template: string
          name: string
          store_id: string
          trigger_days: number | null
        }
        Insert: {
          campaign_type: string
          created_at?: string
          id?: string
          is_active?: boolean
          message_template: string
          name: string
          store_id: string
          trigger_days?: number | null
        }
        Update: {
          campaign_type?: string
          created_at?: string
          id?: string
          is_active?: boolean
          message_template?: string
          name?: string
          store_id?: string
          trigger_days?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "marketing_campaigns_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketing_campaigns_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores_public"
            referencedColumns: ["id"]
          },
        ]
      }
      operations_settings: {
        Row: {
          apply_schedule_enabled: boolean
          avg_prep_minutes: number
          banner_enabled: boolean
          banner_interval_ms: number
          created_at: string
          delivery_schedule: Json
          id: string
          msg_counter: string
          msg_paid: string
          pay_apple_enabled: boolean
          pay_bizum_enabled: boolean
          pay_card_enabled: boolean
          pay_cash_delivery: boolean
          pay_cash_dine_in: boolean
          pay_cash_enabled: boolean
          pay_cash_takeaway: boolean
          pay_counter_enabled: boolean
          pay_google_enabled: boolean
          pay_link_enabled: boolean
          pay_pix_enabled: boolean
          payment_mode: string
          print_pending_dine_in: boolean
          require_phone_takeaway: boolean
          require_prepayment_delivery: boolean
          require_prepayment_takeaway: boolean
          schedule_timezone: string
          store_id: string
          updated_at: string
          weekly_schedule: Json
        }
        Insert: {
          apply_schedule_enabled?: boolean
          avg_prep_minutes?: number
          banner_enabled?: boolean
          banner_interval_ms?: number
          created_at?: string
          delivery_schedule?: Json
          id?: string
          msg_counter?: string
          msg_paid?: string
          pay_apple_enabled?: boolean
          pay_bizum_enabled?: boolean
          pay_card_enabled?: boolean
          pay_cash_delivery?: boolean
          pay_cash_dine_in?: boolean
          pay_cash_enabled?: boolean
          pay_cash_takeaway?: boolean
          pay_counter_enabled?: boolean
          pay_google_enabled?: boolean
          pay_link_enabled?: boolean
          pay_pix_enabled?: boolean
          payment_mode?: string
          print_pending_dine_in?: boolean
          require_phone_takeaway?: boolean
          require_prepayment_delivery?: boolean
          require_prepayment_takeaway?: boolean
          schedule_timezone?: string
          store_id: string
          updated_at?: string
          weekly_schedule?: Json
        }
        Update: {
          apply_schedule_enabled?: boolean
          avg_prep_minutes?: number
          banner_enabled?: boolean
          banner_interval_ms?: number
          created_at?: string
          delivery_schedule?: Json
          id?: string
          msg_counter?: string
          msg_paid?: string
          pay_apple_enabled?: boolean
          pay_bizum_enabled?: boolean
          pay_card_enabled?: boolean
          pay_cash_delivery?: boolean
          pay_cash_dine_in?: boolean
          pay_cash_enabled?: boolean
          pay_cash_takeaway?: boolean
          pay_counter_enabled?: boolean
          pay_google_enabled?: boolean
          pay_link_enabled?: boolean
          pay_pix_enabled?: boolean
          payment_mode?: string
          print_pending_dine_in?: boolean
          require_phone_takeaway?: boolean
          require_prepayment_delivery?: boolean
          require_prepayment_takeaway?: boolean
          schedule_timezone?: string
          store_id?: string
          updated_at?: string
          weekly_schedule?: Json
        }
        Relationships: [
          {
            foreignKeyName: "operations_settings_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: true
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "operations_settings_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: true
            referencedRelation: "stores_public"
            referencedColumns: ["id"]
          },
        ]
      }
      order_items: {
        Row: {
          configuration: Json | null
          extras: Json | null
          id: string
          notes: string | null
          order_id: string
          product_id: string | null
          product_name: string
          quantity: number
          removed: Json
          selections: Json
          size_name: string | null
          total_price: number
          unit_price: number
        }
        Insert: {
          configuration?: Json | null
          extras?: Json | null
          id?: string
          notes?: string | null
          order_id: string
          product_id?: string | null
          product_name: string
          quantity?: number
          removed?: Json
          selections?: Json
          size_name?: string | null
          total_price: number
          unit_price: number
        }
        Update: {
          configuration?: Json | null
          extras?: Json | null
          id?: string
          notes?: string | null
          order_id?: string
          product_id?: string | null
          product_name?: string
          quantity?: number
          removed?: Json
          selections?: Json
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
      order_reviews: {
        Row: {
          comment: string | null
          created_at: string
          customer_name: string | null
          customer_phone: string | null
          driver_name: string | null
          driver_user_id: string | null
          id: string
          order_id: string
          order_type: string | null
          rating: number
          store_id: string
        }
        Insert: {
          comment?: string | null
          created_at?: string
          customer_name?: string | null
          customer_phone?: string | null
          driver_name?: string | null
          driver_user_id?: string | null
          id?: string
          order_id: string
          order_type?: string | null
          rating: number
          store_id: string
        }
        Update: {
          comment?: string | null
          created_at?: string
          customer_name?: string | null
          customer_phone?: string | null
          driver_name?: string | null
          driver_user_id?: string | null
          id?: string
          order_id?: string
          order_type?: string | null
          rating?: number
          store_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "order_reviews_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: true
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_reviews_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_reviews_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores_public"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          accepted_at: string | null
          accepted_by_name: string | null
          accepted_by_user_id: string | null
          application_fee_cents: number
          assigned_driver_id: string | null
          coupon_code: string | null
          created_at: string
          customer_id: string | null
          customer_name: string | null
          customer_phone: string | null
          delivery_city: string | null
          delivery_complement: string | null
          delivery_confirmation_code: string | null
          delivery_fee: number
          delivery_notes: string | null
          delivery_number: string | null
          delivery_postal_code: string | null
          delivery_started_at: string | null
          delivery_street: string | null
          delivery_zone_id: string | null
          delivery_zone_name: string | null
          discount_amount: number
          estimated_ready_at: string | null
          id: string
          is_test: boolean
          kitchen_printed_at: string | null
          net_to_store_cents: number | null
          notes: string | null
          online_service_fee_cents: number
          order_number: string
          order_type: string | null
          payment_method: Database["public"]["Enums"]["payment_method"] | null
          payment_confirmed_at: string | null
          payment_confirmed_by_name: string | null
          payment_confirmed_by_user_id: string | null
          payment_status: Database["public"]["Enums"]["payment_status"]
          platform_fee_cents: number
          processing_fee_cents: number
          seller_id: string | null
          source: Database["public"]["Enums"]["order_source"]
          status: Database["public"]["Enums"]["order_status"]
          store_id: string
          stripe_connect_account_id: string | null
          stripe_fee_cents: number
          stripe_payment_intent_id: string | null
          subtotal: number
          table_customer_id: string | null
          table_number: string | null
          table_session_id: string | null
          table_validated: boolean
          total: number
          updated_at: string
        }
        Insert: {
          accepted_at?: string | null
          accepted_by_name?: string | null
          accepted_by_user_id?: string | null
          application_fee_cents?: number
          assigned_driver_id?: string | null
          coupon_code?: string | null
          created_at?: string
          customer_id?: string | null
          customer_name?: string | null
          customer_phone?: string | null
          delivery_city?: string | null
          delivery_complement?: string | null
          delivery_confirmation_code?: string | null
          delivery_fee?: number
          delivery_notes?: string | null
          delivery_number?: string | null
          delivery_postal_code?: string | null
          delivery_started_at?: string | null
          delivery_street?: string | null
          delivery_zone_id?: string | null
          delivery_zone_name?: string | null
          discount_amount?: number
          estimated_ready_at?: string | null
          id?: string
          is_test?: boolean
          kitchen_printed_at?: string | null
          net_to_store_cents?: number | null
          notes?: string | null
          online_service_fee_cents?: number
          order_number: string
          order_type?: string | null
          payment_method?: Database["public"]["Enums"]["payment_method"] | null
          payment_confirmed_at?: string | null
          payment_confirmed_by_name?: string | null
          payment_confirmed_by_user_id?: string | null
          payment_status?: Database["public"]["Enums"]["payment_status"]
          platform_fee_cents?: number
          processing_fee_cents?: number
          seller_id?: string | null
          source?: Database["public"]["Enums"]["order_source"]
          status?: Database["public"]["Enums"]["order_status"]
          store_id: string
          stripe_connect_account_id?: string | null
          stripe_fee_cents?: number
          stripe_payment_intent_id?: string | null
          subtotal?: number
          table_customer_id?: string | null
          table_number?: string | null
          table_session_id?: string | null
          table_validated?: boolean
          total?: number
          updated_at?: string
        }
        Update: {
          accepted_at?: string | null
          accepted_by_name?: string | null
          accepted_by_user_id?: string | null
          application_fee_cents?: number
          assigned_driver_id?: string | null
          coupon_code?: string | null
          created_at?: string
          customer_id?: string | null
          customer_name?: string | null
          customer_phone?: string | null
          delivery_city?: string | null
          delivery_complement?: string | null
          delivery_confirmation_code?: string | null
          delivery_fee?: number
          delivery_notes?: string | null
          delivery_number?: string | null
          delivery_postal_code?: string | null
          delivery_started_at?: string | null
          delivery_street?: string | null
          delivery_zone_id?: string | null
          delivery_zone_name?: string | null
          discount_amount?: number
          estimated_ready_at?: string | null
          id?: string
          is_test?: boolean
          kitchen_printed_at?: string | null
          net_to_store_cents?: number | null
          notes?: string | null
          online_service_fee_cents?: number
          order_number?: string
          order_type?: string | null
          payment_method?: Database["public"]["Enums"]["payment_method"] | null
          payment_confirmed_at?: string | null
          payment_confirmed_by_name?: string | null
          payment_confirmed_by_user_id?: string | null
          payment_status?: Database["public"]["Enums"]["payment_status"]
          platform_fee_cents?: number
          processing_fee_cents?: number
          seller_id?: string | null
          source?: Database["public"]["Enums"]["order_source"]
          status?: Database["public"]["Enums"]["order_status"]
          store_id?: string
          stripe_connect_account_id?: string | null
          stripe_fee_cents?: number
          stripe_payment_intent_id?: string | null
          subtotal?: number
          table_customer_id?: string | null
          table_number?: string | null
          table_session_id?: string | null
          table_validated?: boolean
          total?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "orders_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_delivery_zone_id_fkey"
            columns: ["delivery_zone_id"]
            isOneToOne: false
            referencedRelation: "delivery_zones"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores_public"
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
      payment_gateway_logs: {
        Row: {
          created_at: string
          direction: string
          endpoint: string | null
          error_message: string | null
          gateway_code: string
          http_status: number | null
          id: string
          ip_address: string | null
          order_id: string | null
          request_payload: Json | null
          response_payload: Json | null
          store_id: string | null
          user_agent: string | null
        }
        Insert: {
          created_at?: string
          direction: string
          endpoint?: string | null
          error_message?: string | null
          gateway_code: string
          http_status?: number | null
          id?: string
          ip_address?: string | null
          order_id?: string | null
          request_payload?: Json | null
          response_payload?: Json | null
          store_id?: string | null
          user_agent?: string | null
        }
        Update: {
          created_at?: string
          direction?: string
          endpoint?: string | null
          error_message?: string | null
          gateway_code?: string
          http_status?: number | null
          id?: string
          ip_address?: string | null
          order_id?: string | null
          request_payload?: Json | null
          response_payload?: Json | null
          store_id?: string | null
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payment_gateway_logs_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_gateway_logs_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_gateway_logs_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores_public"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_gateway_transactions: {
        Row: {
          amount_cents: number
          authorization_code: string | null
          created_at: string
          currency: string
          error_message: string | null
          external_reference: string | null
          gateway_code: string
          id: string
          order_id: string | null
          raw_notification: Json | null
          raw_request: Json | null
          raw_response: Json | null
          response_code: string | null
          signature_valid: boolean | null
          status: string
          store_id: string
          updated_at: string
        }
        Insert: {
          amount_cents: number
          authorization_code?: string | null
          created_at?: string
          currency?: string
          error_message?: string | null
          external_reference?: string | null
          gateway_code: string
          id?: string
          order_id?: string | null
          raw_notification?: Json | null
          raw_request?: Json | null
          raw_response?: Json | null
          response_code?: string | null
          signature_valid?: boolean | null
          status?: string
          store_id: string
          updated_at?: string
        }
        Update: {
          amount_cents?: number
          authorization_code?: string | null
          created_at?: string
          currency?: string
          error_message?: string | null
          external_reference?: string | null
          gateway_code?: string
          id?: string
          order_id?: string | null
          raw_notification?: Json | null
          raw_request?: Json | null
          raw_response?: Json | null
          response_code?: string | null
          signature_valid?: boolean | null
          status?: string
          store_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "payment_gateway_transactions_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_gateway_transactions_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_gateway_transactions_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores_public"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_gateway_webhooks: {
        Row: {
          external_reference: string | null
          gateway_code: string
          id: string
          processed: boolean
          processing_error: string | null
          raw_body: string | null
          raw_headers: Json | null
          received_at: string
          signature: string | null
          signature_valid: boolean | null
          store_id: string | null
        }
        Insert: {
          external_reference?: string | null
          gateway_code: string
          id?: string
          processed?: boolean
          processing_error?: string | null
          raw_body?: string | null
          raw_headers?: Json | null
          received_at?: string
          signature?: string | null
          signature_valid?: boolean | null
          store_id?: string | null
        }
        Update: {
          external_reference?: string | null
          gateway_code?: string
          id?: string
          processed?: boolean
          processing_error?: string | null
          raw_body?: string | null
          raw_headers?: Json | null
          received_at?: string
          signature?: string | null
          signature_valid?: boolean | null
          store_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payment_gateway_webhooks_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_gateway_webhooks_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores_public"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_gateways: {
        Row: {
          code: string
          config_schema: Json
          country: string
          created_at: string
          description: string | null
          id: string
          is_globally_enabled: boolean
          name: string
          supports_refund: boolean
          supports_webhook: boolean
          updated_at: string
        }
        Insert: {
          code: string
          config_schema?: Json
          country?: string
          created_at?: string
          description?: string | null
          id?: string
          is_globally_enabled?: boolean
          name: string
          supports_refund?: boolean
          supports_webhook?: boolean
          updated_at?: string
        }
        Update: {
          code?: string
          config_schema?: Json
          country?: string
          created_at?: string
          description?: string | null
          id?: string
          is_globally_enabled?: boolean
          name?: string
          supports_refund?: boolean
          supports_webhook?: boolean
          updated_at?: string
        }
        Relationships: []
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
      plan_features: {
        Row: {
          feature_id: string
          plan_id: string
        }
        Insert: {
          feature_id: string
          plan_id: string
        }
        Update: {
          feature_id?: string
          plan_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "plan_features_feature_id_fkey"
            columns: ["feature_id"]
            isOneToOne: false
            referencedRelation: "platform_features"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "plan_features_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "platform_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      platform_features: {
        Row: {
          central_group: string
          created_at: string
          description: string | null
          feature_key: string
          id: string
          is_active: boolean
          name: string
          sort_order: number
        }
        Insert: {
          central_group?: string
          created_at?: string
          description?: string | null
          feature_key: string
          id?: string
          is_active?: boolean
          name: string
          sort_order?: number
        }
        Update: {
          central_group?: string
          created_at?: string
          description?: string | null
          feature_key?: string
          id?: string
          is_active?: boolean
          name?: string
          sort_order?: number
        }
        Relationships: []
      }
      platform_plans: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          name: string
          plan_key: string
          sort_order: number
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name: string
          plan_key: string
          sort_order?: number
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
          plan_key?: string
          sort_order?: number
        }
        Relationships: []
      }
      platform_push_config: {
        Row: {
          functions_base_url: string
          id: number
          staff_push_secret: string
          updated_at: string
        }
        Insert: {
          functions_base_url: string
          id?: number
          staff_push_secret?: string
          updated_at?: string
        }
        Update: {
          functions_base_url?: string
          id?: number
          staff_push_secret?: string
          updated_at?: string
        }
        Relationships: []
      }
      platform_settings: {
        Row: {
          ai_auto_images: boolean
          ai_auto_menu: boolean
          ai_image_style: string
          allow_signup: boolean
          apple_touch_icon_url: string | null
          background_color: string | null
          created_at: string
          daily_summary: boolean
          default_currency: string
          default_language: string
          default_max_orders: number
          default_plan: string
          default_timezone: string
          display_name: string | null
          email_notifications: boolean
          favicon_url: string | null
          icon_192_url: string | null
          icon_512_url: string | null
          id: string
          logo_url: string | null
          maintenance_message: string
          maintenance_mode: boolean
          meta_description: string | null
          og_image_url: string | null
          over_limit_alerts: boolean
          password_min_length: number
          platform_name: string
          primary_color: string | null
          require_2fa: boolean
          session_hours: number
          short_name: string | null
          support_email: string
          theme_color: string | null
          trial_days: number
          updated_at: string
        }
        Insert: {
          ai_auto_images?: boolean
          ai_auto_menu?: boolean
          ai_image_style?: string
          allow_signup?: boolean
          apple_touch_icon_url?: string | null
          background_color?: string | null
          created_at?: string
          daily_summary?: boolean
          default_currency?: string
          default_language?: string
          default_max_orders?: number
          default_plan?: string
          default_timezone?: string
          display_name?: string | null
          email_notifications?: boolean
          favicon_url?: string | null
          icon_192_url?: string | null
          icon_512_url?: string | null
          id?: string
          logo_url?: string | null
          maintenance_message?: string
          maintenance_mode?: boolean
          meta_description?: string | null
          og_image_url?: string | null
          over_limit_alerts?: boolean
          password_min_length?: number
          platform_name?: string
          primary_color?: string | null
          require_2fa?: boolean
          session_hours?: number
          short_name?: string | null
          support_email?: string
          theme_color?: string | null
          trial_days?: number
          updated_at?: string
        }
        Update: {
          ai_auto_images?: boolean
          ai_auto_menu?: boolean
          ai_image_style?: string
          allow_signup?: boolean
          apple_touch_icon_url?: string | null
          background_color?: string | null
          created_at?: string
          daily_summary?: boolean
          default_currency?: string
          default_language?: string
          default_max_orders?: number
          default_plan?: string
          default_timezone?: string
          display_name?: string | null
          email_notifications?: boolean
          favicon_url?: string | null
          icon_192_url?: string | null
          icon_512_url?: string | null
          id?: string
          logo_url?: string | null
          maintenance_message?: string
          maintenance_mode?: boolean
          meta_description?: string | null
          og_image_url?: string | null
          over_limit_alerts?: boolean
          password_min_length?: number
          platform_name?: string
          primary_color?: string | null
          require_2fa?: boolean
          session_hours?: number
          short_name?: string | null
          support_email?: string
          theme_color?: string | null
          trial_days?: number
          updated_at?: string
        }
        Relationships: []
      }
      print_jobs: {
        Row: {
          copies: number
          created_at: string
          error_message: string | null
          id: string
          order_id: string | null
          printer_ip: string
          printer_port: number
          status: Database["public"]["Enums"]["print_job_status"]
          store_id: string | null
          ticket_data: string
          updated_at: string
        }
        Insert: {
          copies?: number
          created_at?: string
          error_message?: string | null
          id?: string
          order_id?: string | null
          printer_ip?: string
          printer_port?: number
          status?: Database["public"]["Enums"]["print_job_status"]
          store_id?: string | null
          ticket_data: string
          updated_at?: string
        }
        Update: {
          copies?: number
          created_at?: string
          error_message?: string | null
          id?: string
          order_id?: string | null
          printer_ip?: string
          printer_port?: number
          status?: Database["public"]["Enums"]["print_job_status"]
          store_id?: string | null
          ticket_data?: string
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
          print_mode: string
          printer_copies: number
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
          print_mode?: string
          printer_copies?: number
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
          print_mode?: string
          printer_copies?: number
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
          {
            foreignKeyName: "printer_settings_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: true
            referencedRelation: "stores_public"
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
          {
            foreignKeyName: "printers_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores_public"
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
          after_add_suggestions: Json
          category_id: string
          combo_unit_count: number
          created_at: string
          description: Json | null
          id: string
          image_url: string | null
          is_active: boolean
          is_bestseller: boolean | null
          is_promo: boolean | null
          name: Json
          price: number
          price_modifiers: Json
          product_type: string
          sort_order: number | null
          store_id: string
          updated_at: string
        }
        Insert: {
          after_add_suggestions?: Json
          category_id: string
          combo_unit_count?: number
          created_at?: string
          description?: Json | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          is_bestseller?: boolean | null
          is_promo?: boolean | null
          name?: Json
          price?: number
          price_modifiers?: Json
          product_type?: string
          sort_order?: number | null
          store_id: string
          updated_at?: string
        }
        Update: {
          after_add_suggestions?: Json
          category_id?: string
          combo_unit_count?: number
          created_at?: string
          description?: Json | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          is_bestseller?: boolean | null
          is_promo?: boolean | null
          name?: Json
          price?: number
          price_modifiers?: Json
          product_type?: string
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
          {
            foreignKeyName: "products_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores_public"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          birth_date: string | null
          created_at: string
          full_name: string | null
          id: string
          preferred_language: string
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          birth_date?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          preferred_language?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          birth_date?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          preferred_language?: string
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
          {
            foreignKeyName: "promo_banners_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores_public"
            referencedColumns: ["id"]
          },
        ]
      }
      push_subscriptions: {
        Row: {
          auth: string | null
          created_at: string
          customer_phone: string | null
          endpoint: string
          fcm_token: string | null
          id: string
          order_id: string | null
          p256dh: string | null
          platform: string
          store_id: string | null
        }
        Insert: {
          auth?: string | null
          created_at?: string
          customer_phone?: string | null
          endpoint: string
          fcm_token?: string | null
          id?: string
          order_id?: string | null
          p256dh?: string | null
          platform?: string
          store_id?: string | null
        }
        Update: {
          auth?: string | null
          created_at?: string
          customer_phone?: string | null
          endpoint?: string
          fcm_token?: string | null
          id?: string
          order_id?: string | null
          p256dh?: string | null
          platform?: string
          store_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "push_subscriptions_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "push_subscriptions_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "push_subscriptions_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores_public"
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
      staff_access_pins: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          pin_hash: string
          store_id: string
          updated_at: string
          user_id: string
          user_role_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          pin_hash: string
          store_id: string
          updated_at?: string
          user_id: string
          user_role_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          pin_hash?: string
          store_id?: string
          updated_at?: string
          user_id?: string
          user_role_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "staff_access_pins_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "staff_access_pins_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "staff_access_pins_user_role_id_fkey"
            columns: ["user_role_id"]
            isOneToOne: true
            referencedRelation: "user_roles"
            referencedColumns: ["id"]
          },
        ]
      }
      staff_google_pending: {
        Row: {
          created_at: string
          email: string
          full_name: string | null
          id: string
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          store_id: string
          tenant_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          email: string
          full_name?: string | null
          id?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          store_id: string
          tenant_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          email?: string
          full_name?: string | null
          id?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          store_id?: string
          tenant_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "staff_google_pending_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "staff_google_pending_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores_public"
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
          {
            foreignKeyName: "stock_items_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores_public"
            referencedColumns: ["id"]
          },
        ]
      }
      store_onboarding_links: {
        Row: {
          created_at: string
          created_by: string | null
          environment: string
          expires_at: string
          revoked: boolean
          store_id: string
          token: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          environment?: string
          expires_at?: string
          revoked?: boolean
          store_id: string
          token: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          environment?: string
          expires_at?: string
          revoked?: boolean
          store_id?: string
          token?: string
        }
        Relationships: [
          {
            foreignKeyName: "store_onboarding_links_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "store_onboarding_links_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores_public"
            referencedColumns: ["id"]
          },
        ]
      }
      store_payment_gateways: {
        Row: {
          config: Json
          created_at: string
          currency: string | null
          enabled_at: string | null
          failure_url: string | null
          gateway_code: string
          id: string
          last_test_at: string | null
          last_test_message: string | null
          last_test_success: boolean | null
          merchant_code: string | null
          merchant_name: string | null
          notification_url: string | null
          secret_key: string | null
          status: string
          store_id: string
          success_url: string | null
          terminal: string | null
          transaction_type: string | null
          updated_at: string
        }
        Insert: {
          config?: Json
          created_at?: string
          currency?: string | null
          enabled_at?: string | null
          failure_url?: string | null
          gateway_code: string
          id?: string
          last_test_at?: string | null
          last_test_message?: string | null
          last_test_success?: boolean | null
          merchant_code?: string | null
          merchant_name?: string | null
          notification_url?: string | null
          secret_key?: string | null
          status?: string
          store_id: string
          success_url?: string | null
          terminal?: string | null
          transaction_type?: string | null
          updated_at?: string
        }
        Update: {
          config?: Json
          created_at?: string
          currency?: string | null
          enabled_at?: string | null
          failure_url?: string | null
          gateway_code?: string
          id?: string
          last_test_at?: string | null
          last_test_message?: string | null
          last_test_success?: boolean | null
          merchant_code?: string | null
          merchant_name?: string | null
          notification_url?: string | null
          secret_key?: string | null
          status?: string
          store_id?: string
          success_url?: string | null
          terminal?: string | null
          transaction_type?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "store_payment_gateways_gateway_code_fkey"
            columns: ["gateway_code"]
            isOneToOne: false
            referencedRelation: "payment_gateways"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "store_payment_gateways_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "store_payment_gateways_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores_public"
            referencedColumns: ["id"]
          },
        ]
      }
      store_payment_ledger: {
        Row: {
          created_at: string
          description: string | null
          entry_type: string
          gross_cents: number
          id: string
          net_cents: number
          order_id: string | null
          platform_fee_cents: number
          processing_fee_cents: number
          store_id: string
          stripe_fee_cents: number
          stripe_payment_intent_id: string | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          entry_type?: string
          gross_cents: number
          id?: string
          net_cents: number
          order_id?: string | null
          platform_fee_cents?: number
          processing_fee_cents?: number
          store_id: string
          stripe_fee_cents?: number
          stripe_payment_intent_id?: string | null
        }
        Update: {
          created_at?: string
          description?: string | null
          entry_type?: string
          gross_cents?: number
          id?: string
          net_cents?: number
          order_id?: string | null
          platform_fee_cents?: number
          processing_fee_cents?: number
          store_id?: string
          stripe_fee_cents?: number
          stripe_payment_intent_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "store_payment_ledger_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "store_payment_ledger_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "store_payment_ledger_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores_public"
            referencedColumns: ["id"]
          },
        ]
      }
      store_payout_intake: {
        Row: {
          business_address: string | null
          business_name: string
          iban: string
          notes: string | null
          owner_email: string | null
          owner_full_name: string
          owner_phone: string | null
          store_id: string
          submitted_at: string
          tax_id: string | null
          updated_at: string
        }
        Insert: {
          business_address?: string | null
          business_name: string
          iban: string
          notes?: string | null
          owner_email?: string | null
          owner_full_name: string
          owner_phone?: string | null
          store_id: string
          submitted_at?: string
          tax_id?: string | null
          updated_at?: string
        }
        Update: {
          business_address?: string | null
          business_name?: string
          iban?: string
          notes?: string | null
          owner_email?: string | null
          owner_full_name?: string
          owner_phone?: string | null
          store_id?: string
          submitted_at?: string
          tax_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "store_payout_intake_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: true
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "store_payout_intake_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: true
            referencedRelation: "stores_public"
            referencedColumns: ["id"]
          },
        ]
      }
      store_payouts: {
        Row: {
          amount_cents: number
          arrival_date: string | null
          created_at: string
          id: string
          status: string
          store_id: string
          stripe_payout_id: string | null
          updated_at: string
        }
        Insert: {
          amount_cents: number
          arrival_date?: string | null
          created_at?: string
          id?: string
          status?: string
          store_id: string
          stripe_payout_id?: string | null
          updated_at?: string
        }
        Update: {
          amount_cents?: number
          arrival_date?: string | null
          created_at?: string
          id?: string
          status?: string
          store_id?: string
          stripe_payout_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "store_payouts_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "store_payouts_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores_public"
            referencedColumns: ["id"]
          },
        ]
      }
      stores: {
        Row: {
          address: string | null
          created_at: string
          geocoded_address: string | null
          id: string
          image_url: string | null
          is_active: boolean
          latitude: number | null
          longitude: number | null
          name: string
          phone: string | null
          phone_secondary: string | null
          short_description: string | null
          sort_order: number
          stripe_business_name: string | null
          stripe_charges_enabled: boolean
          stripe_connect_account_id: string | null
          stripe_connect_created_at: string | null
          stripe_connect_environment: string
          stripe_connect_test_simulated: boolean
          stripe_iban_last4: string | null
          stripe_last_payout_at: string | null
          stripe_onboarding_completed: boolean
          stripe_payout_status: string
          stripe_payouts_enabled: boolean
          tenant_id: string
          updated_at: string
          whatsapp_phone: string | null
        }
        Insert: {
          address?: string | null
          created_at?: string
          geocoded_address?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          latitude?: number | null
          longitude?: number | null
          name: string
          phone?: string | null
          phone_secondary?: string | null
          short_description?: string | null
          sort_order?: number
          stripe_business_name?: string | null
          stripe_charges_enabled?: boolean
          stripe_connect_account_id?: string | null
          stripe_connect_created_at?: string | null
          stripe_connect_environment?: string
          stripe_connect_test_simulated?: boolean
          stripe_iban_last4?: string | null
          stripe_last_payout_at?: string | null
          stripe_onboarding_completed?: boolean
          stripe_payout_status?: string
          stripe_payouts_enabled?: boolean
          tenant_id: string
          updated_at?: string
          whatsapp_phone?: string | null
        }
        Update: {
          address?: string | null
          created_at?: string
          geocoded_address?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          latitude?: number | null
          longitude?: number | null
          name?: string
          phone?: string | null
          phone_secondary?: string | null
          short_description?: string | null
          sort_order?: number
          stripe_business_name?: string | null
          stripe_charges_enabled?: boolean
          stripe_connect_account_id?: string | null
          stripe_connect_created_at?: string | null
          stripe_connect_environment?: string
          stripe_connect_test_simulated?: boolean
          stripe_iban_last4?: string | null
          stripe_last_payout_at?: string | null
          stripe_onboarding_completed?: boolean
          stripe_payout_status?: string
          stripe_payouts_enabled?: boolean
          tenant_id?: string
          updated_at?: string
          whatsapp_phone?: string | null
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
          {
            foreignKeyName: "table_session_customers_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores_public"
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
            foreignKeyName: "table_sessions_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores_public"
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
          qr_token: string
          store_id: string
          updated_at: string
        }
        Insert: {
          capacity?: number | null
          created_at?: string
          id?: string
          is_active?: boolean
          number: string
          qr_token: string
          store_id: string
          updated_at?: string
        }
        Update: {
          capacity?: number | null
          created_at?: string
          id?: string
          is_active?: boolean
          number?: string
          qr_token?: string
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
          {
            foreignKeyName: "tables_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores_public"
            referencedColumns: ["id"]
          },
        ]
      }
      template_update_history: {
        Row: {
          applied_at: string
          applied_by: string | null
          created_at: string
          id: string
          migration_names: string[]
          notes: string | null
          project_name: string | null
          requires_apk_rebuild: boolean
          success: boolean
          update_type: string
          version: string
        }
        Insert: {
          applied_at?: string
          applied_by?: string | null
          created_at?: string
          id?: string
          migration_names?: string[]
          notes?: string | null
          project_name?: string | null
          requires_apk_rebuild?: boolean
          success?: boolean
          update_type?: string
          version: string
        }
        Update: {
          applied_at?: string
          applied_by?: string | null
          created_at?: string
          id?: string
          migration_names?: string[]
          notes?: string | null
          project_name?: string | null
          requires_apk_rebuild?: boolean
          success?: boolean
          update_type?: string
          version?: string
        }
        Relationships: []
      }
      tenant_ai_modules: {
        Row: {
          config: Json
          id: string
          is_enabled: boolean
          module_key: string
          status: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          config?: Json
          id?: string
          is_enabled?: boolean
          module_key: string
          status?: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          config?: Json
          id?: string
          is_enabled?: boolean
          module_key?: string
          status?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tenant_ai_modules_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tenant_feature_overrides: {
        Row: {
          enabled: boolean
          feature_key: string
          id: string
          notes: string | null
          tenant_id: string
          updated_at: string
        }
        Insert: {
          enabled: boolean
          feature_key: string
          id?: string
          notes?: string | null
          tenant_id: string
          updated_at?: string
        }
        Update: {
          enabled?: boolean
          feature_key?: string
          id?: string
          notes?: string | null
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tenant_feature_overrides_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tenant_loyalty_programs: {
        Row: {
          config: Json
          id: string
          is_active: boolean
          model_type: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          config?: Json
          id?: string
          is_active?: boolean
          model_type?: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          config?: Json
          id?: string
          is_active?: boolean
          model_type?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tenant_loyalty_programs_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tenant_plan_assignments: {
        Row: {
          assigned_at: string
          is_beta: boolean
          plan_id: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          assigned_at?: string
          is_beta?: boolean
          plan_id: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          assigned_at?: string
          is_beta?: boolean
          plan_id?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tenant_plan_assignments_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "platform_plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tenant_plan_assignments_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: true
            referencedRelation: "tenants"
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
          editing_locked_at: string | null
          editing_locked_by: string | null
          id: string
          is_active: boolean
          is_template: boolean
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
          editing_locked_at?: string | null
          editing_locked_by?: string | null
          id?: string
          is_active?: boolean
          is_template?: boolean
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
          editing_locked_at?: string | null
          editing_locked_by?: string | null
          id?: string
          is_active?: boolean
          is_template?: boolean
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
          screen_config: Json
          secondary_color: string | null
          splash_image_duration_ms: number
          splash_logo_dark_url: string | null
          splash_logo_size: number
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
          screen_config?: Json
          secondary_color?: string | null
          splash_image_duration_ms?: number
          splash_logo_dark_url?: string | null
          splash_logo_size?: number
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
          screen_config?: Json
          secondary_color?: string | null
          splash_image_duration_ms?: number
          splash_logo_dark_url?: string | null
          splash_logo_size?: number
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
          {
            foreignKeyName: "totem_config_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: true
            referencedRelation: "stores_public"
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
            foreignKeyName: "user_roles_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores_public"
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
      driver_review_stats: {
        Row: {
          avg_rating: number | null
          driver_name: string | null
          driver_user_id: string | null
          last_review_at: string | null
          reviews_count: number | null
          store_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "order_reviews_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_reviews_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores_public"
            referencedColumns: ["id"]
          },
        ]
      }
      stores_public: {
        Row: {
          address: string | null
          created_at: string | null
          geocoded_address: string | null
          id: string | null
          image_url: string | null
          is_active: boolean | null
          latitude: number | null
          longitude: number | null
          name: string | null
          short_description: string | null
          sort_order: number | null
          tenant_id: string | null
        }
        Insert: {
          address?: string | null
          created_at?: string | null
          geocoded_address?: string | null
          id?: string | null
          image_url?: string | null
          is_active?: boolean | null
          latitude?: number | null
          longitude?: number | null
          name?: string | null
          short_description?: string | null
          sort_order?: number | null
          tenant_id?: string | null
        }
        Update: {
          address?: string | null
          created_at?: string | null
          geocoded_address?: string | null
          id?: string | null
          image_url?: string | null
          is_active?: boolean | null
          latitude?: number | null
          longitude?: number | null
          name?: string | null
          short_description?: string | null
          sort_order?: number | null
          tenant_id?: string | null
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
    }
    Functions: {
      acquire_tenant_edit_lock: { Args: { _tenant_id: string }; Returns: Json }
      add_loyalty_stamp: {
        Args: { _customer_id?: string; _phone: string; _store_id: string }
        Returns: Json
      }
      add_or_get_table_customer: {
        Args: { _name: string; _session_id: string }
        Returns: string
      }
      add_or_get_table_customer_public: {
        Args: { _name?: string; _session_id: string }
        Returns: string
      }
      add_team_member_to_store: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _store_id: string
          _tenant_id: string
          _user_id: string
        }
        Returns: string
      }
      admin_clear_print_jobs: {
        Args: { _statuses?: string[]; _store_id?: string }
        Returns: Json
      }
      admin_print_jobs_diagnostic: {
        Args: { _store_id?: string }
        Returns: Json
      }
      admin_requeue_print_jobs: { Args: { _store_id?: string }; Returns: Json }
      advance_test_order_status: {
        Args: { _new_status: string; _order_id: string }
        Returns: Json
      }
      apply_template_catchup: {
        Args: { _target_version: string }
        Returns: Json
      }
      approve_staff_google_pending: {
        Args: {
          _full_name?: string
          _pending_id: string
          _preferred_language?: string
          _role: Database["public"]["Enums"]["app_role"]
        }
        Returns: Json
      }
      assign_delivery_driver: {
        Args: { _driver_user_id: string; _order_id: string }
        Returns: Json
      }
      claim_kitchen_print: { Args: { _order_id: string }; Returns: boolean }
      cleanup_print_jobs: {
        Args: {
          _older_than_hours?: number
          _only_tests?: boolean
          _statuses?: string[]
          _store_id: string
        }
        Returns: Json
      }
      cleanup_test_orders: {
        Args: { _older_than?: string; _store_id?: string }
        Returns: Json
      }
      close_table_customer: {
        Args: { _customer_id: string; _payment_method: string }
        Returns: Json
      }
      close_table_session_unified: {
        Args: { _payment_method: string; _session_id: string }
        Returns: Json
      }
      confirm_delivery_with_code: {
        Args: { _code: string; _order_id: string }
        Returns: Json
      }
      confirm_order_payment: {
        Args: { _payment_status?: string; _stripe_payment_intent_id: string }
        Returns: Json
      }
      count_active_sellers: { Args: { _tenant_id: string }; Returns: number }
      create_customer_order: {
        Args: {
          _application_fee_cents?: number
          _coupon_code?: string
          _coupon_id?: string
          _customer_name?: string
          _customer_phone?: string
          _delivery_city?: string
          _delivery_complement?: string
          _delivery_fee?: number
          _delivery_notes?: string
          _delivery_number?: string
          _delivery_postal_code?: string
          _delivery_street?: string
          _delivery_zone_id?: string
          _delivery_zone_name?: string
          _discount_amount?: number
          _items: Json
          _net_to_store_cents?: number
          _notes?: string
          _online_service_fee_cents?: number
          _order_type: string
          _payment_method?: string
          _payment_status?: string
          _platform_fee_cents?: number
          _store_id: string
          _stripe_connect_account_id?: string
          _stripe_fee_cents?: number
          _stripe_payment_intent_id?: string
          _subtotal?: number
          _table_id?: string
          _table_number?: string
          _total: number
        }
        Returns: Json
      }
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
      dispatch_staff_new_order_push: {
        Args: { _order_id: string; _order_number: string; _store_id: string }
        Returns: undefined
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
      enqueue_print_job: {
        Args: {
          _copies_override?: number
          _force_reprint?: boolean
          _order_id?: string
          _store_id: string
          _ticket_data: string
        }
        Returns: string
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
      get_customer_orders: {
        Args: { _phone: string; _store_id: string }
        Returns: {
          created_at: string
          id: string
          items: Json
          order_number: string
          order_type: string
          status: string
          total: number
        }[]
      }
      get_customer_saved_profile: {
        Args: { _phone: string; _store_id: string }
        Returns: Json
      }
      get_driver_deliveries: {
        Args: { _store_id?: string }
        Returns: {
          assigned_driver_id: string
          created_at: string
          customer_name: string
          customer_phone: string
          delivery_city: string
          delivery_confirmation_code: string
          delivery_notes: string
          delivery_number: string
          delivery_started_at: string
          delivery_street: string
          estimated_ready_at: string
          id: string
          notes: string
          order_number: string
          status: string
          total: number
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
      get_loyalty_status: {
        Args: { _phone: string; _store_id: string }
        Returns: Json
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
      get_my_staff_context: { Args: never; Returns: Json }
      get_operational_diagnostics: {
        Args: { _store_id?: string }
        Returns: Json
      }
      get_order_public: {
        Args: { _order_id: string }
        Returns: {
          created_at: string
          delivery_city: string
          delivery_fee: number
          delivery_number: string
          delivery_postal_code: string
          delivery_street: string
          discount_amount: number
          estimated_ready_at: string
          id: string
          order_number: string
          order_type: string
          payment_status: string
          status: string
          total: number
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
      get_public_table_binding: {
        Args: {
          _known_session_id?: string
          _qr_token: string
          _store_id: string
        }
        Returns: Json
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
      get_store_checkout_stripe_profile: {
        Args: { _store_id: string }
        Returns: Json
      }
      get_store_customer_contact: { Args: { _store_id: string }; Returns: Json }
      get_store_payout_intake: {
        Args: { _store_id: string }
        Returns: {
          business_address: string | null
          business_name: string
          iban: string
          notes: string | null
          owner_email: string | null
          owner_full_name: string
          owner_phone: string | null
          store_id: string
          submitted_at: string
          tax_id: string | null
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "store_payout_intake"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      get_store_team_member_emails: {
        Args: { _store_id: string }
        Returns: {
          email: string
          user_id: string
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
      get_template_version_status: {
        Args: never
        Returns: {
          applied_at: string
          project_name: string
          version: string
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
      get_tenant_feature_flags: {
        Args: { _tenant_id: string }
        Returns: {
          central_group: string
          enabled: boolean
          feature_key: string
          name: string
          source: string
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
      has_order_review: { Args: { _order_id: string }; Returns: boolean }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_seller: { Args: { _user_id: string }; Returns: boolean }
      is_tenant_over_limit: { Args: { _tenant_id: string }; Returns: boolean }
      list_staff_google_pending: {
        Args: { _store_id: string }
        Returns: {
          created_at: string
          email: string
          full_name: string
          id: string
          user_id: string
        }[]
      }
      list_store_drivers: {
        Args: { _store_id: string }
        Returns: {
          full_name: string
          user_id: string
        }[]
      }
      lookup_staff_user_by_email: { Args: { _email: string }; Returns: string }
      manager_create_staff_auth_user: {
        Args: { _email: string; _full_name?: string; _password: string }
        Returns: string
      }
      manager_repair_staff_login: {
        Args: { _password: string; _user_id: string }
        Returns: undefined
      }
      manager_set_staff_password: {
        Args: { _password: string; _user_id: string }
        Returns: undefined
      }
      mark_order_paid_at_counter: {
        Args: { _order_id: string; _payment_method?: string }
        Returns: Json
      }
      next_order_number: { Args: { _store_id: string }; Returns: string }
      open_or_get_table_session: {
        Args: { _store_id: string; _table_number: string }
        Returns: string
      }
      open_or_get_table_session_public: {
        Args: { _store_id: string; _table_id?: string; _table_number: string }
        Returns: string
      }
      open_table_session_on_scan_public: {
        Args: { _qr_token: string; _store_id: string }
        Returns: Json
      }
      order_should_notify_staff_on_panel: {
        Args: { p: Database["public"]["Tables"]["orders"]["Row"] }
        Returns: boolean
      }
      record_order_refund: {
        Args: { _order_id: string; _reason?: string }
        Returns: Json
      }
      record_payment_failure: {
        Args: {
          _failure_code?: string
          _failure_message?: string
          _stripe_payment_intent_id: string
        }
        Returns: Json
      }
      record_payment_settlement:
        | {
            Args: {
              _net_to_store_cents: number
              _online_service_fee_cents?: number
              _platform_fee_cents: number
              _processing_fee_cents: number
              _stripe_fee_cents: number
              _stripe_payment_intent_id: string
            }
            Returns: Json
          }
        | {
            Args: {
              _net_to_store_cents: number
              _online_service_fee_cents?: number
              _payment_method?: string
              _platform_fee_cents: number
              _processing_fee_cents: number
              _stripe_fee_cents: number
              _stripe_payment_intent_id: string
            }
            Returns: Json
          }
      regenerate_table_qr_token: {
        Args: { _table_id: string }
        Returns: string
      }
      register_push_subscription: {
        Args: {
          _auth?: string
          _customer_phone?: string
          _endpoint?: string
          _order_id?: string
          _p256dh?: string
          _store_id: string
        }
        Returns: undefined
      }
      register_staff_google_login: {
        Args: { _store_id: string }
        Returns: Json
      }
      reject_staff_google_pending: {
        Args: { _pending_id: string }
        Returns: Json
      }
      release_tenant_edit_lock: {
        Args: { _tenant_id: string }
        Returns: undefined
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
      retry_failed_print_jobs: { Args: { _store_id: string }; Returns: number }
      set_tenant_feature_override: {
        Args: {
          _enabled: boolean
          _feature_key: string
          _notes?: string
          _tenant_id: string
        }
        Returns: undefined
      }
      set_tenant_plan: {
        Args: { _is_beta?: boolean; _plan_key: string; _tenant_id: string }
        Returns: undefined
      }
      staff_pin_in_use: {
        Args: { _exclude_role_id?: string; _pin: string; _store_id: string }
        Returns: boolean
      }
      start_delivery: { Args: { _order_id: string }; Returns: Json }
      submit_order_review: {
        Args: { _comment?: string; _order_id: string; _rating: number }
        Returns: Json
      }
      sync_store_stripe_profile: {
        Args: {
          _business_name?: string
          _charges_enabled: boolean
          _iban_last4?: string
          _onboarding_completed: boolean
          _payout_status?: string
          _payouts_enabled: boolean
          _stripe_account_id: string
        }
        Returns: undefined
      }
      tenant_has_feature: {
        Args: { _feature_key: string; _tenant_id: string }
        Returns: boolean
      }
      upsert_customer_saved_profile: {
        Args: {
          _delivery?: Json
          _name?: string
          _phone: string
          _store_id: string
        }
        Returns: undefined
      }
      upsert_my_staff_profile: {
        Args: {
          _avatar_url?: string
          _birth_date?: string
          _full_name?: string
        }
        Returns: undefined
      }
      upsert_staff_access_pin: {
        Args: { _pin: string; _user_role_id: string }
        Returns: undefined
      }
      upsert_staff_profile_by_manager:
        | {
            Args: {
              _full_name?: string
              _preferred_language?: string
              _user_id: string
            }
            Returns: undefined
          }
        | {
            Args: {
              _avatar_url?: string
              _birth_date?: string
              _full_name?: string
              _preferred_language?: string
              _user_id: string
            }
            Returns: undefined
          }
      upsert_store_payout_intake: {
        Args: {
          _business_address?: string
          _business_name: string
          _iban: string
          _notes?: string
          _owner_email?: string
          _owner_full_name: string
          _owner_phone?: string
          _store_id: string
          _tax_id?: string
        }
        Returns: undefined
      }
      user_can_access_store:
        | { Args: { _store_id: string }; Returns: boolean }
        | { Args: { _store_id: string; _user_id: string }; Returns: boolean }
      user_can_access_tenant: { Args: { _tenant_id: string }; Returns: boolean }
      user_can_view_team_at_store: {
        Args: { _store_id: string }
        Returns: boolean
      }
      user_has_google_identity: { Args: { _user_id: string }; Returns: boolean }
      user_is_delivery_driver: {
        Args: { _store_id: string; _user_id: string }
        Returns: boolean
      }
      user_manages_store_team: { Args: { _store_id: string }; Returns: boolean }
      validate_coupon: {
        Args: { _code: string; _store_id: string; _subtotal: number }
        Returns: Json
      }
      verify_staff_access_pin: {
        Args: { _pin: string; _store_id: string }
        Returns: {
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }[]
      }
    }
    Enums: {
      app_role:
        | "admin_master"
        | "restaurant_admin"
        | "operator"
        | "kitchen"
        | "seller"
        | "manager"
        | "cashier"
        | "attendant"
        | "delivery"
      order_source: "totem" | "ifood" | "counter" | "delivery" | "waiter"
      order_status:
        | "pending"
        | "preparing"
        | "ready"
        | "delivered"
        | "cancelled"
        | "out_for_delivery"
      payment_method:
        | "card"
        | "cash"
        | "apple_pay"
        | "google_pay"
        | "pix"
        | "bizum"
      payment_status: "pending" | "paid" | "failed" | "refunded"
      print_job_status: "pending" | "printing" | "printed" | "failed"
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
        "manager",
        "cashier",
        "attendant",
        "delivery",
      ],
      order_source: ["totem", "ifood", "counter", "delivery", "waiter"],
      order_status: [
        "pending",
        "preparing",
        "ready",
        "delivered",
        "cancelled",
        "out_for_delivery",
      ],
      payment_method: [
        "card",
        "cash",
        "apple_pay",
        "google_pay",
        "pix",
        "bizum",
      ],
      payment_status: ["pending", "paid", "failed", "refunded"],
      print_job_status: ["pending", "printing", "printed", "failed"],
    },
  },
} as const
