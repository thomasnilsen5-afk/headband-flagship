
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  
  "graphql_public": {
          Tables: {
            [_ in never]: never
          }
          Views: {
            [_ in never]: never
          }
          Functions: {
            "graphql":
{ Args: { "extensions"?: Json,"operationName"?: string,"query"?: string,"variables"?: Json }; Returns: Json
                           }
          }
          Enums: {
            [_ in never]: never
          }
          CompositeTypes: {
            [_ in never]: never
          }
        },"public": {
          Tables: {
            "addresses": {
                  Row: {
                    "city": string,"country": string,"created_at": string,"full_name": string,"id": string,"is_default": boolean,"label": string | null,"line1": string,"line2": string | null,"phone": string | null,"postal_code": string,"updated_at": string,"user_id": string
                  }
                  Insert: {
                    "city": string,"country"?: string,"created_at"?: string,"full_name": string,"id"?: string,"is_default"?: boolean,"label"?: string | null,"line1": string,"line2"?: string | null,"phone"?: string | null,"postal_code": string,"updated_at"?: string,"user_id": string
                  }
                  Update: {
                    "city"?: string,"country"?: string,"created_at"?: string,"full_name"?: string,"id"?: string,"is_default"?: boolean,"label"?: string | null,"line1"?: string,"line2"?: string | null,"phone"?: string | null,"postal_code"?: string,"updated_at"?: string,"user_id"?: string
                  }
                  Relationships: [
                    
                  ]
                },"audit_log": {
                  Row: {
                    "action": string,"actor_id": string | null,"created_at": string,"diff": Json | null,"entity": string,"entity_id": string | null,"id": number
                  }
                  Insert: {
                    "action": string,"actor_id"?: string | null,"created_at"?: string,"diff"?: Json | null,"entity": string,"entity_id"?: string | null,"id"?: never
                  }
                  Update: {
                    "action"?: string,"actor_id"?: string | null,"created_at"?: string,"diff"?: Json | null,"entity"?: string,"entity_id"?: string | null,"id"?: never
                  }
                  Relationships: [
                    
                  ]
                },"bundle_items": {
                  Row: {
                    "bundle_id": string,"product_id": string,"qty": number
                  }
                  Insert: {
                    "bundle_id": string,"product_id": string,"qty"?: number
                  }
                  Update: {
                    "bundle_id"?: string,"product_id"?: string,"qty"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "bundle_items_bundle_id_fkey"
      columns: ["bundle_id"]
isOneToOne: false
      referencedRelation: "bundles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "bundle_items_product_id_fkey"
      columns: ["product_id"]
isOneToOne: false
      referencedRelation: "products"
      referencedColumns: ["id"]
    }
                  ]
                },"bundles": {
                  Row: {
                    "created_at": string,"description": Json | null,"discount_bp": number,"id": string,"name": NonNullable<Json>,"position": number,"slug": string,"status": Database["public"]['Enums']["product_status"],"updated_at": string
                  }
                  Insert: {
                    "created_at"?: string,"description"?: Json | null,"discount_bp": number,"id"?: string,"name": NonNullable<Json>,"position"?: number,"slug": string,"status"?: Database["public"]['Enums']["product_status"],"updated_at"?: string
                  }
                  Update: {
                    "created_at"?: string,"description"?: Json | null,"discount_bp"?: number,"id"?: string,"name"?: NonNullable<Json>,"position"?: number,"slug"?: string,"status"?: Database["public"]['Enums']["product_status"],"updated_at"?: string
                  }
                  Relationships: [
                    
                  ]
                },"cart_items": {
                  Row: {
                    "bundle_group": string | null,"bundle_id": string | null,"cart_id": string,"created_at": string,"id": string,"qty": number,"variant_id": string
                  }
                  Insert: {
                    "bundle_group"?: string | null,"bundle_id"?: string | null,"cart_id": string,"created_at"?: string,"id"?: string,"qty": number,"variant_id": string
                  }
                  Update: {
                    "bundle_group"?: string | null,"bundle_id"?: string | null,"cart_id"?: string,"created_at"?: string,"id"?: string,"qty"?: number,"variant_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "cart_items_bundle_id_fkey"
      columns: ["bundle_id"]
isOneToOne: false
      referencedRelation: "bundles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "cart_items_cart_id_fkey"
      columns: ["cart_id"]
isOneToOne: false
      referencedRelation: "carts"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "cart_items_variant_id_fkey"
      columns: ["variant_id"]
isOneToOne: false
      referencedRelation: "product_variants"
      referencedColumns: ["id"]
    }
                  ]
                },"carts": {
                  Row: {
                    "abandoned_email_sent_at": string | null,"converted_order_id": string | null,"country": string,"created_at": string,"discount_code": string | null,"email": string | null,"id": string,"locale": Database["public"]['Enums']["locale"],"token_hash": string | null,"updated_at": string,"user_id": string | null
                  }
                  Insert: {
                    "abandoned_email_sent_at"?: string | null,"converted_order_id"?: string | null,"country"?: string,"created_at"?: string,"discount_code"?: string | null,"email"?: string | null,"id"?: string,"locale"?: Database["public"]['Enums']["locale"],"token_hash"?: string | null,"updated_at"?: string,"user_id"?: string | null
                  }
                  Update: {
                    "abandoned_email_sent_at"?: string | null,"converted_order_id"?: string | null,"country"?: string,"created_at"?: string,"discount_code"?: string | null,"email"?: string | null,"id"?: string,"locale"?: Database["public"]['Enums']["locale"],"token_hash"?: string | null,"updated_at"?: string,"user_id"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "carts_converted_order_fk"
      columns: ["converted_order_id"]
isOneToOne: false
      referencedRelation: "orders"
      referencedColumns: ["id"]
    }
                  ]
                },"collections": {
                  Row: {
                    "created_at": string,"description": Json | null,"id": string,"name": NonNullable<Json>,"position": number,"slug": string,"status": Database["public"]['Enums']["product_status"],"updated_at": string
                  }
                  Insert: {
                    "created_at"?: string,"description"?: Json | null,"id"?: string,"name": NonNullable<Json>,"position"?: number,"slug": string,"status"?: Database["public"]['Enums']["product_status"],"updated_at"?: string
                  }
                  Update: {
                    "created_at"?: string,"description"?: Json | null,"id"?: string,"name"?: NonNullable<Json>,"position"?: number,"slug"?: string,"status"?: Database["public"]['Enums']["product_status"],"updated_at"?: string
                  }
                  Relationships: [
                    
                  ]
                },"content_blocks": {
                  Row: {
                    "data": NonNullable<Json>,"key": string,"locale": Database["public"]['Enums']["locale"],"updated_at": string,"updated_by": string | null
                  }
                  Insert: {
                    "data": NonNullable<Json>,"key": string,"locale": Database["public"]['Enums']["locale"],"updated_at"?: string,"updated_by"?: string | null
                  }
                  Update: {
                    "data"?: NonNullable<Json>,"key"?: string,"locale"?: Database["public"]['Enums']["locale"],"updated_at"?: string,"updated_by"?: string | null
                  }
                  Relationships: [
                    
                  ]
                },"discount_redemptions": {
                  Row: {
                    "created_at": string,"discount_id": string,"email": string,"id": string,"order_id": string,"user_id": string | null
                  }
                  Insert: {
                    "created_at"?: string,"discount_id": string,"email": string,"id"?: string,"order_id": string,"user_id"?: string | null
                  }
                  Update: {
                    "created_at"?: string,"discount_id"?: string,"email"?: string,"id"?: string,"order_id"?: string,"user_id"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "discount_redemptions_discount_id_fkey"
      columns: ["discount_id"]
isOneToOne: false
      referencedRelation: "discounts"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "discount_redemptions_order_id_fkey"
      columns: ["order_id"]
isOneToOne: false
      referencedRelation: "orders"
      referencedColumns: ["id"]
    }
                  ]
                },"discounts": {
                  Row: {
                    "code": string,"created_at": string,"ends_at": string | null,"id": string,"is_active": boolean,"kind": Database["public"]['Enums']["discount_kind"],"min_subtotal_ore": number,"per_customer_limit": number | null,"starts_at": string | null,"times_used": number,"updated_at": string,"usage_limit": number | null,"value": number
                  }
                  Insert: {
                    "code": string,"created_at"?: string,"ends_at"?: string | null,"id"?: string,"is_active"?: boolean,"kind": Database["public"]['Enums']["discount_kind"],"min_subtotal_ore"?: number,"per_customer_limit"?: number | null,"starts_at"?: string | null,"times_used"?: number,"updated_at"?: string,"usage_limit"?: number | null,"value"?: number
                  }
                  Update: {
                    "code"?: string,"created_at"?: string,"ends_at"?: string | null,"id"?: string,"is_active"?: boolean,"kind"?: Database["public"]['Enums']["discount_kind"],"min_subtotal_ore"?: number,"per_customer_limit"?: number | null,"starts_at"?: string | null,"times_used"?: number,"updated_at"?: string,"usage_limit"?: number | null,"value"?: number
                  }
                  Relationships: [
                    
                  ]
                },"drops": {
                  Row: {
                    "created_at": string,"description": Json | null,"ends_at": string | null,"id": string,"is_published": boolean,"max_per_customer": number | null,"name": NonNullable<Json>,"slug": string,"starts_at": string,"updated_at": string
                  }
                  Insert: {
                    "created_at"?: string,"description"?: Json | null,"ends_at"?: string | null,"id"?: string,"is_published"?: boolean,"max_per_customer"?: number | null,"name": NonNullable<Json>,"slug": string,"starts_at": string,"updated_at"?: string
                  }
                  Update: {
                    "created_at"?: string,"description"?: Json | null,"ends_at"?: string | null,"id"?: string,"is_published"?: boolean,"max_per_customer"?: number | null,"name"?: NonNullable<Json>,"slug"?: string,"starts_at"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    
                  ]
                },"email_log": {
                  Row: {
                    "id": number,"kind": string,"provider_id": string | null,"recipient": string,"ref": string,"sent_at": string
                  }
                  Insert: {
                    "id"?: never,"kind": string,"provider_id"?: string | null,"recipient": string,"ref": string,"sent_at"?: string
                  }
                  Update: {
                    "id"?: never,"kind"?: string,"provider_id"?: string | null,"recipient"?: string,"ref"?: string,"sent_at"?: string
                  }
                  Relationships: [
                    
                  ]
                },"inventory": {
                  Row: {
                    "available": number | null,"low_stock_threshold": number,"on_hand": number,"reserved": number,"updated_at": string,"variant_id": string
                  }
                  Insert: {
                    "available"?: never,"low_stock_threshold"?: number,"on_hand"?: number,"reserved"?: number,"updated_at"?: string,"variant_id": string
                  }
                  Update: {
                    "available"?: never,"low_stock_threshold"?: number,"on_hand"?: number,"reserved"?: number,"updated_at"?: string,"variant_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "inventory_variant_id_fkey"
      columns: ["variant_id"]
isOneToOne: true
      referencedRelation: "product_variants"
      referencedColumns: ["id"]
    }
                  ]
                },"inventory_movements": {
                  Row: {
                    "actor_id": string | null,"created_at": string,"delta": number,"id": number,"reason": string,"ref": string | null,"variant_id": string
                  }
                  Insert: {
                    "actor_id"?: string | null,"created_at"?: string,"delta": number,"id"?: never,"reason": string,"ref"?: string | null,"variant_id": string
                  }
                  Update: {
                    "actor_id"?: string | null,"created_at"?: string,"delta"?: number,"id"?: never,"reason"?: string,"ref"?: string | null,"variant_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "inventory_movements_variant_id_fkey"
      columns: ["variant_id"]
isOneToOne: false
      referencedRelation: "product_variants"
      referencedColumns: ["id"]
    }
                  ]
                },"inventory_reservations": {
                  Row: {
                    "created_at": string,"expires_at": string,"id": string,"order_id": string,"qty": number,"status": Database["public"]['Enums']["reservation_status"],"updated_at": string,"variant_id": string
                  }
                  Insert: {
                    "created_at"?: string,"expires_at": string,"id"?: string,"order_id": string,"qty": number,"status"?: Database["public"]['Enums']["reservation_status"],"updated_at"?: string,"variant_id": string
                  }
                  Update: {
                    "created_at"?: string,"expires_at"?: string,"id"?: string,"order_id"?: string,"qty"?: number,"status"?: Database["public"]['Enums']["reservation_status"],"updated_at"?: string,"variant_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "inventory_reservations_order_id_fkey"
      columns: ["order_id"]
isOneToOne: false
      referencedRelation: "orders"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "inventory_reservations_variant_id_fkey"
      columns: ["variant_id"]
isOneToOne: false
      referencedRelation: "product_variants"
      referencedColumns: ["id"]
    }
                  ]
                },"order_items": {
                  Row: {
                    "bundle_group": string | null,"created_at": string,"discount_ore": number,"id": string,"line_total_ore": number,"name": string,"order_id": string,"product_id": string | null,"qty": number,"sku": string,"tax_ore": number,"unit_price_ore": number,"variant_id": string | null,"variant_label": string,"vat_rate_bp": number
                  }
                  Insert: {
                    "bundle_group"?: string | null,"created_at"?: string,"discount_ore"?: number,"id"?: string,"line_total_ore": number,"name": string,"order_id": string,"product_id"?: string | null,"qty": number,"sku": string,"tax_ore": number,"unit_price_ore": number,"variant_id"?: string | null,"variant_label": string,"vat_rate_bp": number
                  }
                  Update: {
                    "bundle_group"?: string | null,"created_at"?: string,"discount_ore"?: number,"id"?: string,"line_total_ore"?: number,"name"?: string,"order_id"?: string,"product_id"?: string | null,"qty"?: number,"sku"?: string,"tax_ore"?: number,"unit_price_ore"?: number,"variant_id"?: string | null,"variant_label"?: string,"vat_rate_bp"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "order_items_order_id_fkey"
      columns: ["order_id"]
isOneToOne: false
      referencedRelation: "orders"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "order_items_product_id_fkey"
      columns: ["product_id"]
isOneToOne: false
      referencedRelation: "products"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "order_items_variant_id_fkey"
      columns: ["variant_id"]
isOneToOne: false
      referencedRelation: "product_variants"
      referencedColumns: ["id"]
    }
                  ]
                },"orders": {
                  Row: {
                    "billing_address": Json | null,"cancelled_at": string | null,"carrier": string | null,"cart_id": string | null,"created_at": string,"currency": string,"delivered_at": string | null,"discount_code": string | null,"discount_ore": number,"email": string,"fulfilled_at": string | null,"id": string,"locale": Database["public"]['Enums']["locale"],"notes": string | null,"number": number,"paid_at": string | null,"payment_provider": Database["public"]['Enums']["payment_provider"] | null,"phone": string | null,"shipped_at": string | null,"shipping_address": NonNullable<Json>,"shipping_ore": number,"shipping_rate_code": string | null,"status": Database["public"]['Enums']["order_status"],"subtotal_ore": number,"tax_ore": number,"total_ore": number,"tracking_number": string | null,"tracking_url": string | null,"updated_at": string,"user_id": string | null,"vat_mode": Database["public"]['Enums']["vat_mode"]
                  }
                  Insert: {
                    "billing_address"?: Json | null,"cancelled_at"?: string | null,"carrier"?: string | null,"cart_id"?: string | null,"created_at"?: string,"currency"?: string,"delivered_at"?: string | null,"discount_code"?: string | null,"discount_ore"?: number,"email": string,"fulfilled_at"?: string | null,"id"?: string,"locale"?: Database["public"]['Enums']["locale"],"notes"?: string | null,"number"?: number,"paid_at"?: string | null,"payment_provider"?: Database["public"]['Enums']["payment_provider"] | null,"phone"?: string | null,"shipped_at"?: string | null,"shipping_address": NonNullable<Json>,"shipping_ore"?: number,"shipping_rate_code"?: string | null,"status"?: Database["public"]['Enums']["order_status"],"subtotal_ore": number,"tax_ore": number,"total_ore": number,"tracking_number"?: string | null,"tracking_url"?: string | null,"updated_at"?: string,"user_id"?: string | null,"vat_mode"?: Database["public"]['Enums']["vat_mode"]
                  }
                  Update: {
                    "billing_address"?: Json | null,"cancelled_at"?: string | null,"carrier"?: string | null,"cart_id"?: string | null,"created_at"?: string,"currency"?: string,"delivered_at"?: string | null,"discount_code"?: string | null,"discount_ore"?: number,"email"?: string,"fulfilled_at"?: string | null,"id"?: string,"locale"?: Database["public"]['Enums']["locale"],"notes"?: string | null,"number"?: number,"paid_at"?: string | null,"payment_provider"?: Database["public"]['Enums']["payment_provider"] | null,"phone"?: string | null,"shipped_at"?: string | null,"shipping_address"?: NonNullable<Json>,"shipping_ore"?: number,"shipping_rate_code"?: string | null,"status"?: Database["public"]['Enums']["order_status"],"subtotal_ore"?: number,"tax_ore"?: number,"total_ore"?: number,"tracking_number"?: string | null,"tracking_url"?: string | null,"updated_at"?: string,"user_id"?: string | null,"vat_mode"?: Database["public"]['Enums']["vat_mode"]
                  }
                  Relationships: [
                    {
      foreignKeyName: "orders_cart_id_fkey"
      columns: ["cart_id"]
isOneToOne: false
      referencedRelation: "carts"
      referencedColumns: ["id"]
    }
                  ]
                },"payments": {
                  Row: {
                    "amount_ore": number,"created_at": string,"currency": string,"id": string,"order_id": string,"provider": Database["public"]['Enums']["payment_provider"],"provider_ref": string,"raw": Json | null,"refunded_ore": number,"status": Database["public"]['Enums']["payment_status"],"updated_at": string
                  }
                  Insert: {
                    "amount_ore": number,"created_at"?: string,"currency"?: string,"id"?: string,"order_id": string,"provider": Database["public"]['Enums']["payment_provider"],"provider_ref": string,"raw"?: Json | null,"refunded_ore"?: number,"status"?: Database["public"]['Enums']["payment_status"],"updated_at"?: string
                  }
                  Update: {
                    "amount_ore"?: number,"created_at"?: string,"currency"?: string,"id"?: string,"order_id"?: string,"provider"?: Database["public"]['Enums']["payment_provider"],"provider_ref"?: string,"raw"?: Json | null,"refunded_ore"?: number,"status"?: Database["public"]['Enums']["payment_status"],"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "payments_order_id_fkey"
      columns: ["order_id"]
isOneToOne: false
      referencedRelation: "orders"
      referencedColumns: ["id"]
    }
                  ]
                },"product_media": {
                  Row: {
                    "alt": NonNullable<Json>,"created_at": string,"height": number | null,"id": string,"kind": string,"position": number,"product_id": string,"url": string,"variant_id": string | null,"width": number | null
                  }
                  Insert: {
                    "alt": NonNullable<Json>,"created_at"?: string,"height"?: number | null,"id"?: string,"kind"?: string,"position"?: number,"product_id": string,"url": string,"variant_id"?: string | null,"width"?: number | null
                  }
                  Update: {
                    "alt"?: NonNullable<Json>,"created_at"?: string,"height"?: number | null,"id"?: string,"kind"?: string,"position"?: number,"product_id"?: string,"url"?: string,"variant_id"?: string | null,"width"?: number | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "product_media_product_id_fkey"
      columns: ["product_id"]
isOneToOne: false
      referencedRelation: "products"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "product_media_variant_id_fkey"
      columns: ["variant_id"]
isOneToOne: false
      referencedRelation: "product_variants"
      referencedColumns: ["id"]
    }
                  ]
                },"product_variants": {
                  Row: {
                    "barcode": string | null,"color_hex": string,"color_key": string,"color_name": NonNullable<Json>,"created_at": string,"id": string,"is_active": boolean,"position": number,"price_ore": number | null,"product_id": string,"size": string,"sku": string,"updated_at": string,"weight_g": number | null
                  }
                  Insert: {
                    "barcode"?: string | null,"color_hex": string,"color_key": string,"color_name": NonNullable<Json>,"created_at"?: string,"id"?: string,"is_active"?: boolean,"position"?: number,"price_ore"?: number | null,"product_id": string,"size": string,"sku": string,"updated_at"?: string,"weight_g"?: number | null
                  }
                  Update: {
                    "barcode"?: string | null,"color_hex"?: string,"color_key"?: string,"color_name"?: NonNullable<Json>,"created_at"?: string,"id"?: string,"is_active"?: boolean,"position"?: number,"price_ore"?: number | null,"product_id"?: string,"size"?: string,"sku"?: string,"updated_at"?: string,"weight_g"?: number | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "product_variants_product_id_fkey"
      columns: ["product_id"]
isOneToOne: false
      referencedRelation: "products"
      referencedColumns: ["id"]
    }
                  ]
                },"products": {
                  Row: {
                    "collection_id": string | null,"compare_at_ore": number | null,"created_at": string,"description": Json | null,"drop_id": string | null,"form": NonNullable<Json>,"id": string,"is_limited": boolean,"materials": NonNullable<Json>,"name": NonNullable<Json>,"position": number,"price_ore": number,"published_at": string | null,"search": unknown,"seo": Json | null,"slug": string,"specs": NonNullable<Json>,"status": Database["public"]['Enums']["product_status"],"tagline": Json | null,"updated_at": string,"vat_rate_bp": number
                  }
                  Insert: {
                    "collection_id"?: string | null,"compare_at_ore"?: number | null,"created_at"?: string,"description"?: Json | null,"drop_id"?: string | null,"form"?: NonNullable<Json>,"id"?: string,"is_limited"?: boolean,"materials"?: NonNullable<Json>,"name": NonNullable<Json>,"position"?: number,"price_ore": number,"published_at"?: string | null,"search"?: never,"seo"?: Json | null,"slug": string,"specs"?: NonNullable<Json>,"status"?: Database["public"]['Enums']["product_status"],"tagline"?: Json | null,"updated_at"?: string,"vat_rate_bp"?: number
                  }
                  Update: {
                    "collection_id"?: string | null,"compare_at_ore"?: number | null,"created_at"?: string,"description"?: Json | null,"drop_id"?: string | null,"form"?: NonNullable<Json>,"id"?: string,"is_limited"?: boolean,"materials"?: NonNullable<Json>,"name"?: NonNullable<Json>,"position"?: number,"price_ore"?: number,"published_at"?: string | null,"search"?: never,"seo"?: Json | null,"slug"?: string,"specs"?: NonNullable<Json>,"status"?: Database["public"]['Enums']["product_status"],"tagline"?: Json | null,"updated_at"?: string,"vat_rate_bp"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "products_collection_id_fkey"
      columns: ["collection_id"]
isOneToOne: false
      referencedRelation: "collections"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "products_drop_id_fkey"
      columns: ["drop_id"]
isOneToOne: false
      referencedRelation: "drops"
      referencedColumns: ["id"]
    }
                  ]
                },"profiles": {
                  Row: {
                    "created_at": string,"full_name": string | null,"id": string,"locale": Database["public"]['Enums']["locale"],"marketing_opt_in": boolean,"marketing_opt_in_at": string | null,"role": Database["public"]['Enums']["app_role"],"updated_at": string
                  }
                  Insert: {
                    "created_at"?: string,"full_name"?: string | null,"id": string,"locale"?: Database["public"]['Enums']["locale"],"marketing_opt_in"?: boolean,"marketing_opt_in_at"?: string | null,"role"?: Database["public"]['Enums']["app_role"],"updated_at"?: string
                  }
                  Update: {
                    "created_at"?: string,"full_name"?: string | null,"id"?: string,"locale"?: Database["public"]['Enums']["locale"],"marketing_opt_in"?: boolean,"marketing_opt_in_at"?: string | null,"role"?: Database["public"]['Enums']["app_role"],"updated_at"?: string
                  }
                  Relationships: [
                    
                  ]
                },"returns": {
                  Row: {
                    "id": string,"items": NonNullable<Json>,"order_id": string,"reason": string | null,"refund_ore": number | null,"requested_at": string,"resolved_at": string | null,"staff_notes": string | null,"status": Database["public"]['Enums']["return_status"],"updated_at": string,"user_id": string | null
                  }
                  Insert: {
                    "id"?: string,"items": NonNullable<Json>,"order_id": string,"reason"?: string | null,"refund_ore"?: number | null,"requested_at"?: string,"resolved_at"?: string | null,"staff_notes"?: string | null,"status"?: Database["public"]['Enums']["return_status"],"updated_at"?: string,"user_id"?: string | null
                  }
                  Update: {
                    "id"?: string,"items"?: NonNullable<Json>,"order_id"?: string,"reason"?: string | null,"refund_ore"?: number | null,"requested_at"?: string,"resolved_at"?: string | null,"staff_notes"?: string | null,"status"?: Database["public"]['Enums']["return_status"],"updated_at"?: string,"user_id"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "returns_order_id_fkey"
      columns: ["order_id"]
isOneToOne: false
      referencedRelation: "orders"
      referencedColumns: ["id"]
    }
                  ]
                },"review_media": {
                  Row: {
                    "created_at": string,"height": number | null,"id": string,"review_id": string,"storage_path": string,"width": number | null
                  }
                  Insert: {
                    "created_at"?: string,"height"?: number | null,"id"?: string,"review_id": string,"storage_path": string,"width"?: number | null
                  }
                  Update: {
                    "created_at"?: string,"height"?: number | null,"id"?: string,"review_id"?: string,"storage_path"?: string,"width"?: number | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "review_media_review_id_fkey"
      columns: ["review_id"]
isOneToOne: false
      referencedRelation: "reviews"
      referencedColumns: ["id"]
    }
                  ]
                },"reviews": {
                  Row: {
                    "author_name": string,"body": string,"created_at": string,"id": string,"is_verified": boolean,"locale": Database["public"]['Enums']["locale"],"product_id": string,"published_at": string | null,"rating": number,"status": Database["public"]['Enums']["review_status"],"title": string | null,"updated_at": string,"user_id": string
                  }
                  Insert: {
                    "author_name": string,"body": string,"created_at"?: string,"id"?: string,"is_verified"?: boolean,"locale"?: Database["public"]['Enums']["locale"],"product_id": string,"published_at"?: string | null,"rating": number,"status"?: Database["public"]['Enums']["review_status"],"title"?: string | null,"updated_at"?: string,"user_id": string
                  }
                  Update: {
                    "author_name"?: string,"body"?: string,"created_at"?: string,"id"?: string,"is_verified"?: boolean,"locale"?: Database["public"]['Enums']["locale"],"product_id"?: string,"published_at"?: string | null,"rating"?: number,"status"?: Database["public"]['Enums']["review_status"],"title"?: string | null,"updated_at"?: string,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "reviews_product_id_fkey"
      columns: ["product_id"]
isOneToOne: false
      referencedRelation: "products"
      referencedColumns: ["id"]
    }
                  ]
                },"shipping_rates": {
                  Row: {
                    "carrier": string,"code": string,"created_at": string,"eta_days_max": number,"eta_days_min": number,"free_over_ore": number | null,"id": string,"is_active": boolean,"name": NonNullable<Json>,"position": number,"price_ore": number,"updated_at": string,"zone": string
                  }
                  Insert: {
                    "carrier": string,"code": string,"created_at"?: string,"eta_days_max": number,"eta_days_min": number,"free_over_ore"?: number | null,"id"?: string,"is_active"?: boolean,"name": NonNullable<Json>,"position"?: number,"price_ore": number,"updated_at"?: string,"zone": string
                  }
                  Update: {
                    "carrier"?: string,"code"?: string,"created_at"?: string,"eta_days_max"?: number,"eta_days_min"?: number,"free_over_ore"?: number | null,"id"?: string,"is_active"?: boolean,"name"?: NonNullable<Json>,"position"?: number,"price_ore"?: number,"updated_at"?: string,"zone"?: string
                  }
                  Relationships: [
                    
                  ]
                },"store_settings": {
                  Row: {
                    "key": string,"updated_at": string,"value": NonNullable<Json>
                  }
                  Insert: {
                    "key": string,"updated_at"?: string,"value": NonNullable<Json>
                  }
                  Update: {
                    "key"?: string,"updated_at"?: string,"value"?: NonNullable<Json>
                  }
                  Relationships: [
                    
                  ]
                },"waitlist_entries": {
                  Row: {
                    "consent_at": string,"created_at": string,"drop_id": string | null,"email": string,"id": string,"kind": Database["public"]['Enums']["waitlist_kind"],"locale": Database["public"]['Enums']["locale"],"notified_at": string | null,"user_id": string | null,"variant_id": string | null
                  }
                  Insert: {
                    "consent_at"?: string,"created_at"?: string,"drop_id"?: string | null,"email": string,"id"?: string,"kind": Database["public"]['Enums']["waitlist_kind"],"locale"?: Database["public"]['Enums']["locale"],"notified_at"?: string | null,"user_id"?: string | null,"variant_id"?: string | null
                  }
                  Update: {
                    "consent_at"?: string,"created_at"?: string,"drop_id"?: string | null,"email"?: string,"id"?: string,"kind"?: Database["public"]['Enums']["waitlist_kind"],"locale"?: Database["public"]['Enums']["locale"],"notified_at"?: string | null,"user_id"?: string | null,"variant_id"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "waitlist_entries_drop_id_fkey"
      columns: ["drop_id"]
isOneToOne: false
      referencedRelation: "drops"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "waitlist_entries_variant_id_fkey"
      columns: ["variant_id"]
isOneToOne: false
      referencedRelation: "product_variants"
      referencedColumns: ["id"]
    }
                  ]
                },"webhook_events": {
                  Row: {
                    "attempts": number,"event_id": string,"event_type": string,"id": number,"last_error": string | null,"payload": NonNullable<Json>,"processed_at": string | null,"provider": string,"received_at": string
                  }
                  Insert: {
                    "attempts"?: number,"event_id": string,"event_type": string,"id"?: never,"last_error"?: string | null,"payload": NonNullable<Json>,"processed_at"?: string | null,"provider": string,"received_at"?: string
                  }
                  Update: {
                    "attempts"?: number,"event_id"?: string,"event_type"?: string,"id"?: never,"last_error"?: string | null,"payload"?: NonNullable<Json>,"processed_at"?: string | null,"provider"?: string,"received_at"?: string
                  }
                  Relationships: [
                    
                  ]
                },"wishlist_items": {
                  Row: {
                    "created_at": string,"product_id": string,"user_id": string
                  }
                  Insert: {
                    "created_at"?: string,"product_id": string,"user_id": string
                  }
                  Update: {
                    "created_at"?: string,"product_id"?: string,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "wishlist_items_product_id_fkey"
      columns: ["product_id"]
isOneToOne: false
      referencedRelation: "products"
      referencedColumns: ["id"]
    }
                  ]
                }
          }
          Views: {
            [_ in never]: never
          }
          Functions: {
            "adjust_inventory":
{ Args: { "p_delta": number,"p_reason": string,"p_ref"?: string,"p_variant_id": string }; Returns: {
              "available": number | null,
"low_stock_threshold": number,
"on_hand": number,
"reserved": number,
"updated_at": string,
"variant_id": string
            }
                          SetofOptions: {
        from: "*"
        to: "inventory"
        isOneToOne: true
        isSetofReturn: false
      } },
"claim_guest_orders":
{ Args: Record<PropertyKey, never>; Returns: number
                           },
"claim_webhook_event":
{ Args: { "p_event_id": string,"p_payload": Json,"p_provider": string,"p_type": string }; Returns: boolean
                           },
"complete_webhook_event":
{ Args: { "p_error"?: string,"p_event_id": string,"p_provider": string }; Returns: undefined
                           },
"confirm_order_payment":
{ Args: { "p_amount_ore": number,"p_order_id": string,"p_payment_status"?: Database["public"]['Enums']["payment_status"],"p_provider": Database["public"]['Enums']["payment_provider"],"p_provider_ref": string,"p_raw"?: Json }; Returns: boolean
                           },
"current_app_role":
{ Args: Record<PropertyKey, never>; Returns: Database["public"]['Enums']["app_role"]
                           },
"lookup_discount":
{ Args: { "p_code": string,"p_email"?: string }; Returns: {
              "code": string,
"created_at": string,
"ends_at": string | null,
"id": string,
"is_active": boolean,
"kind": Database["public"]['Enums']["discount_kind"],
"min_subtotal_ore": number,
"per_customer_limit": number | null,
"starts_at": string | null,
"times_used": number,
"updated_at": string,
"usage_limit": number | null,
"value": number
            }
                          SetofOptions: {
        from: "*"
        to: "discounts"
        isOneToOne: true
        isSetofReturn: false
      } },
"mark_order_delivered":
{ Args: { "p_actor": string,"p_order_id": string }; Returns: boolean
                           },
"mark_order_paid":
{ Args: { "p_amount_ore": number,"p_order_id": string,"p_provider": Database["public"]['Enums']["payment_provider"],"p_provider_ref": string,"p_raw"?: Json }; Returns: boolean
                           },
"mark_order_shipped":
{ Args: { "p_actor": string,"p_carrier": string,"p_order_id": string,"p_tracking_number": string,"p_tracking_url": string }; Returns: boolean
                           },
"place_order":
{ Args: { "p_items": Json,"p_order": Json,"p_reservation_minutes"?: number }; Returns: {
              "billing_address": Json | null,
"cancelled_at": string | null,
"carrier": string | null,
"cart_id": string | null,
"created_at": string,
"currency": string,
"delivered_at": string | null,
"discount_code": string | null,
"discount_ore": number,
"email": string,
"fulfilled_at": string | null,
"id": string,
"locale": Database["public"]['Enums']["locale"],
"notes": string | null,
"number": number,
"paid_at": string | null,
"payment_provider": Database["public"]['Enums']["payment_provider"] | null,
"phone": string | null,
"shipped_at": string | null,
"shipping_address": NonNullable<Json>,
"shipping_ore": number,
"shipping_rate_code": string | null,
"status": Database["public"]['Enums']["order_status"],
"subtotal_ore": number,
"tax_ore": number,
"total_ore": number,
"tracking_number": string | null,
"tracking_url": string | null,
"updated_at": string,
"user_id": string | null,
"vat_mode": Database["public"]['Enums']["vat_mode"]
            }
                          SetofOptions: {
        from: "*"
        to: "orders"
        isOneToOne: true
        isSetofReturn: false
      } },
"release_expired_reservations":
{ Args: Record<PropertyKey, never>; Returns: number
                           },
"release_order":
{ Args: { "p_order_id": string,"p_status"?: Database["public"]['Enums']["order_status"] }; Returns: {
              "billing_address": Json | null,
"cancelled_at": string | null,
"carrier": string | null,
"cart_id": string | null,
"created_at": string,
"currency": string,
"delivered_at": string | null,
"discount_code": string | null,
"discount_ore": number,
"email": string,
"fulfilled_at": string | null,
"id": string,
"locale": Database["public"]['Enums']["locale"],
"notes": string | null,
"number": number,
"paid_at": string | null,
"payment_provider": Database["public"]['Enums']["payment_provider"] | null,
"phone": string | null,
"shipped_at": string | null,
"shipping_address": NonNullable<Json>,
"shipping_ore": number,
"shipping_rate_code": string | null,
"status": Database["public"]['Enums']["order_status"],
"subtotal_ore": number,
"tax_ore": number,
"total_ore": number,
"tracking_number": string | null,
"tracking_url": string | null,
"updated_at": string,
"user_id": string | null,
"vat_mode": Database["public"]['Enums']["vat_mode"]
            }
                          SetofOptions: {
        from: "*"
        to: "orders"
        isOneToOne: true
        isSetofReturn: false
      } },
"request_return":
{ Args: { "p_items": Json,"p_order_id": string,"p_reason"?: string }; Returns: {
              "id": string,
"items": NonNullable<Json>,
"order_id": string,
"reason": string | null,
"refund_ore": number | null,
"requested_at": string,
"resolved_at": string | null,
"staff_notes": string | null,
"status": Database["public"]['Enums']["return_status"],
"updated_at": string,
"user_id": string | null
            }
                          SetofOptions: {
        from: "*"
        to: "returns"
        isOneToOne: true
        isSetofReturn: false
      } },
"search_products":
{ Args: { "p_limit"?: number,"p_query": string }; Returns: {
              "collection_id": string | null,
"compare_at_ore": number | null,
"created_at": string,
"description": Json | null,
"drop_id": string | null,
"form": NonNullable<Json>,
"id": string,
"is_limited": boolean,
"materials": NonNullable<Json>,
"name": NonNullable<Json>,
"position": number,
"price_ore": number,
"published_at": string | null,
"search": unknown,
"seo": Json | null,
"slug": string,
"specs": NonNullable<Json>,
"status": Database["public"]['Enums']["product_status"],
"tagline": Json | null,
"updated_at": string,
"vat_rate_bp": number
            }[]
                          SetofOptions: {
        from: "*"
        to: "products"
        isOneToOne: false
        isSetofReturn: true
      } },
"set_return_status":
{ Args: { "p_actor": string,"p_refund_ore": number,"p_return_id": string,"p_status": Database["public"]['Enums']["return_status"] }; Returns: {
              "id": string,
"items": NonNullable<Json>,
"order_id": string,
"reason": string | null,
"refund_ore": number | null,
"requested_at": string,
"resolved_at": string | null,
"staff_notes": string | null,
"status": Database["public"]['Enums']["return_status"],
"updated_at": string,
"user_id": string | null
            }
                          SetofOptions: {
        from: "*"
        to: "returns"
        isOneToOne: true
        isSetofReturn: false
      } }
          }
          Enums: {
            "app_role": "customer"|"staff"|"admin","discount_kind": "percent"|"fixed"|"free_shipping","locale": "nb"|"en","order_status": "pending"|"paid"|"fulfilled"|"shipped"|"delivered"|"cancelled"|"expired"|"refunded"|"partially_refunded","payment_provider": "stripe"|"vipps"|"test","payment_status": "pending"|"authorized"|"captured"|"failed"|"cancelled"|"refunded"|"partially_refunded","product_status": "draft"|"active"|"archived","reservation_status": "active"|"committed"|"released","return_status": "requested"|"approved"|"received"|"refunded"|"rejected","review_status": "pending"|"published"|"rejected","vat_mode": "domestic"|"export","waitlist_kind": "drop"|"back_in_stock"
          }
          CompositeTypes: {
            [_ in never]: never
          }
        }
}

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>

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
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
  ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
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
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
    : never = never
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
    : never = never
> = PublicCompositeTypeNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
  ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
  : never

export const Constants = {
  "graphql_public": {
          Enums: {
            
          }
        },"public": {
          Enums: {
            "app_role": ["customer", "staff", "admin"],"discount_kind": ["percent", "fixed", "free_shipping"],"locale": ["nb", "en"],"order_status": ["pending", "paid", "fulfilled", "shipped", "delivered", "cancelled", "expired", "refunded", "partially_refunded"],"payment_provider": ["stripe", "vipps", "test"],"payment_status": ["pending", "authorized", "captured", "failed", "cancelled", "refunded", "partially_refunded"],"product_status": ["draft", "active", "archived"],"reservation_status": ["active", "committed", "released"],"return_status": ["requested", "approved", "received", "refunded", "rejected"],"review_status": ["pending", "published", "rejected"],"vat_mode": ["domestic", "export"],"waitlist_kind": ["drop", "back_in_stock"]
          }
        }
} as const
