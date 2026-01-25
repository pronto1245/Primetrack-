CREATE TYPE "public"."click_id_storage" AS ENUM('click_id', 'sub1', 'sub2', 'sub3', 'sub4', 'sub5', 'sub6', 'sub7', 'sub8', 'sub9', 'sub10');--> statement-breakpoint
CREATE TYPE "public"."invoice_status" AS ENUM('draft', 'issued', 'paid', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."postback_direction" AS ENUM('inbound', 'outbound');--> statement-breakpoint
CREATE TYPE "public"."publisher_tracker_type" AS ENUM('keitaro', 'binom', 'custom');--> statement-breakpoint
CREATE TABLE "acme_accounts" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"private_key" text NOT NULL,
	"account_url" text,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "acme_challenges" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"domain_id" varchar NOT NULL,
	"token" text NOT NULL,
	"key_authorization" text NOT NULL,
	"challenge_type" text DEFAULT 'http-01' NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"expires_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "advertiser_settings" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"advertiser_id" varchar NOT NULL,
	"postback_url" text,
	"postback_method" text DEFAULT 'GET',
	"lead_postback_url" text,
	"lead_postback_method" text DEFAULT 'GET',
	"sale_postback_url" text,
	"sale_postback_method" text DEFAULT 'GET',
	"brand_name" text,
	"logo_url" text,
	"favicon_url" text,
	"primary_color" text,
	"secondary_color" text,
	"accent_color" text,
	"custom_domain" text,
	"hide_platform_branding" boolean DEFAULT false,
	"custom_css" text,
	"email_logo_url" text,
	"email_footer_text" text,
	"default_hold_period_days" integer DEFAULT 7,
	"binance_api_key" text,
	"binance_secret_key" text,
	"bybit_api_key" text,
	"bybit_secret_key" text,
	"kraken_api_key" text,
	"kraken_secret_key" text,
	"coinbase_api_key" text,
	"coinbase_secret_key" text,
	"exmo_api_key" text,
	"exmo_secret_key" text,
	"mexc_api_key" text,
	"mexc_secret_key" text,
	"okx_api_key" text,
	"okx_secret_key" text,
	"okx_passphrase" text,
	"telegram_bot_token" text,
	"email_notify_leads" boolean DEFAULT true,
	"email_notify_sales" boolean DEFAULT true,
	"email_notify_payouts" boolean DEFAULT true,
	"email_notify_system" boolean DEFAULT true,
	"smtp_host" text,
	"smtp_port" integer,
	"smtp_user" text,
	"smtp_password" text,
	"smtp_from_email" text,
	"smtp_from_name" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "advertiser_settings_advertiser_id_unique" UNIQUE("advertiser_id")
);
--> statement-breakpoint
CREATE TABLE "advertiser_sources" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"advertiser_id" varchar NOT NULL,
	"name" text NOT NULL,
	"brand" text,
	"contact" text,
	"chat_link" text,
	"site_name" text,
	"login" text,
	"password_encrypted" text,
	"site_url" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "advertiser_staff" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"advertiser_id" varchar NOT NULL,
	"email" text NOT NULL,
	"full_name" text NOT NULL,
	"staff_role" text NOT NULL,
	"password" text NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "advertiser_staff_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "advertiser_subscriptions" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"advertiser_id" varchar NOT NULL,
	"plan_id" varchar,
	"billing_cycle" text DEFAULT 'monthly' NOT NULL,
	"status" text DEFAULT 'trial' NOT NULL,
	"trial_ends_at" timestamp,
	"current_period_start" timestamp,
	"current_period_end" timestamp,
	"last_payment_id" varchar,
	"last_payment_at" timestamp,
	"cancelled_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "antifraud_logs" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"click_id" varchar,
	"offer_id" varchar,
	"advertiser_id" varchar,
	"publisher_id" varchar,
	"fraud_score" integer DEFAULT 0 NOT NULL,
	"is_proxy" boolean DEFAULT false,
	"is_vpn" boolean DEFAULT false,
	"is_bot" boolean DEFAULT false,
	"is_datacenter" boolean DEFAULT false,
	"signals" text,
	"matched_rule_ids" text[] DEFAULT ARRAY[]::text[],
	"action" text DEFAULT 'allow' NOT NULL,
	"ip" text,
	"user_agent" text,
	"country" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "antifraud_metrics" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"date" timestamp NOT NULL,
	"advertiser_id" varchar,
	"offer_id" varchar,
	"total_clicks" integer DEFAULT 0 NOT NULL,
	"blocked_clicks" integer DEFAULT 0 NOT NULL,
	"flagged_clicks" integer DEFAULT 0 NOT NULL,
	"proxy_vpn_count" integer DEFAULT 0 NOT NULL,
	"bot_count" integer DEFAULT 0 NOT NULL,
	"datacenter_count" integer DEFAULT 0 NOT NULL,
	"low_risk_count" integer DEFAULT 0 NOT NULL,
	"medium_risk_count" integer DEFAULT 0 NOT NULL,
	"high_risk_count" integer DEFAULT 0 NOT NULL,
	"average_fraud_score" numeric(5, 2) DEFAULT '0',
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "antifraud_rules" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"scope" text DEFAULT 'global' NOT NULL,
	"advertiser_id" varchar,
	"name" text NOT NULL,
	"description" text,
	"rule_type" text NOT NULL,
	"threshold" integer,
	"action" text DEFAULT 'flag' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"priority" integer DEFAULT 100 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "clicks" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"click_id" varchar NOT NULL,
	"offer_id" varchar NOT NULL,
	"publisher_id" varchar NOT NULL,
	"landing_id" varchar,
	"variant_id" varchar,
	"ip" text,
	"user_agent" text,
	"geo" text,
	"city" text,
	"referer" text,
	"device" text,
	"os" text,
	"browser" text,
	"sub1" text,
	"sub2" text,
	"sub3" text,
	"sub4" text,
	"sub5" text,
	"sub6" text,
	"sub7" text,
	"sub8" text,
	"sub9" text,
	"sub10" text,
	"is_unique" boolean DEFAULT true,
	"is_geo_match" boolean DEFAULT true,
	"is_bot" boolean DEFAULT false,
	"fingerprint" text,
	"visitor_id" text,
	"fingerprint_confidence" numeric(5, 4),
	"is_proxy" boolean DEFAULT false,
	"is_vpn" boolean DEFAULT false,
	"is_tor" boolean DEFAULT false,
	"is_datacenter" boolean DEFAULT false,
	"fraud_score" integer DEFAULT 0,
	"is_suspicious" boolean DEFAULT false,
	"suspicious_reasons" text,
	"antifraud_action" text DEFAULT 'allow',
	"matched_rule_ids" text,
	"region" text,
	"isp" text,
	"asn" text,
	"redirect_url" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "clicks_click_id_unique" UNIQUE("click_id")
);
--> statement-breakpoint
CREATE TABLE "conversion_fingerprints" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"offer_id" varchar,
	"advertiser_id" varchar,
	"publisher_id" varchar,
	"email_hash" text,
	"phone_hash" text,
	"transaction_id" text,
	"device_fingerprint" text,
	"conversion_id" varchar,
	"click_id" varchar,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "conversions" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"click_id" varchar NOT NULL,
	"offer_id" varchar NOT NULL,
	"publisher_id" varchar NOT NULL,
	"conversion_type" text DEFAULT 'lead' NOT NULL,
	"advertiser_cost" numeric(10, 2) NOT NULL,
	"payout" numeric(10, 2) NOT NULL,
	"transaction_sum" numeric(10, 2),
	"currency" text DEFAULT 'USD' NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"hold_until" timestamp,
	"approved_at" timestamp,
	"rejected_at" timestamp,
	"rejection_reason" text,
	"external_id" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "crypto_payout_logs" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"payout_queue_id" varchar,
	"payout_request_id" varchar,
	"advertiser_id" varchar NOT NULL,
	"operation" text NOT NULL,
	"exchange" text NOT NULL,
	"request_payload" text,
	"response_payload" text,
	"success" boolean NOT NULL,
	"error_code" text,
	"error_message" text,
	"operator_id" varchar,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "crypto_payout_queue" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"payout_request_id" varchar NOT NULL,
	"exchange_api_key_id" varchar NOT NULL,
	"to_address" text NOT NULL,
	"amount" numeric(18, 8) NOT NULL,
	"currency" text NOT NULL,
	"network" text,
	"status" text DEFAULT 'pending' NOT NULL,
	"exchange_order_id" text,
	"exchange_tx_hash" text,
	"exchange_response" text,
	"attempts" integer DEFAULT 0 NOT NULL,
	"max_attempts" integer DEFAULT 3 NOT NULL,
	"last_error" text,
	"next_retry_at" timestamp,
	"idempotency_key" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"processed_at" timestamp,
	"confirmed_at" timestamp,
	CONSTRAINT "crypto_payout_queue_idempotency_key_unique" UNIQUE("idempotency_key")
);
--> statement-breakpoint
CREATE TABLE "custom_domains" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"advertiser_id" varchar NOT NULL,
	"domain" text NOT NULL,
	"verification_token" text NOT NULL,
	"verification_method" text DEFAULT 'ns' NOT NULL,
	"is_verified" boolean DEFAULT false,
	"verified_at" timestamp,
	"request_status" text DEFAULT 'pending',
	"ns_verified" boolean DEFAULT false,
	"ns_verified_at" timestamp,
	"admin_notes" text,
	"rejection_reason" text,
	"requested_at" timestamp,
	"activated_at" timestamp,
	"ssl_status" text DEFAULT 'pending',
	"ssl_expires_at" timestamp,
	"ssl_certificate" text,
	"ssl_private_key" text,
	"ssl_chain" text,
	"cloudflare_hostname_id" text,
	"cloudflare_status" text,
	"cloudflare_ssl_status" text,
	"dns_target" text,
	"last_synced_at" timestamp,
	"is_primary" boolean DEFAULT false,
	"is_active" boolean DEFAULT true,
	"last_error" text,
	"cloudflare_error" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "custom_domains_domain_unique" UNIQUE("domain")
);
--> statement-breakpoint
CREATE TABLE "daily_stats" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"date" date NOT NULL,
	"advertiser_id" varchar DEFAULT '' NOT NULL,
	"publisher_id" varchar DEFAULT '' NOT NULL,
	"offer_id" varchar DEFAULT '' NOT NULL,
	"geo" text DEFAULT '' NOT NULL,
	"clicks" integer DEFAULT 0 NOT NULL,
	"unique_clicks" integer DEFAULT 0 NOT NULL,
	"conversions" integer DEFAULT 0 NOT NULL,
	"approved_conversions" integer DEFAULT 0 NOT NULL,
	"rejected_conversions" integer DEFAULT 0 NOT NULL,
	"leads" integer DEFAULT 0 NOT NULL,
	"sales" integer DEFAULT 0 NOT NULL,
	"payout" numeric(12, 2) DEFAULT '0' NOT NULL,
	"cost" numeric(12, 2) DEFAULT '0' NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "data_migrations" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"advertiser_id" varchar NOT NULL,
	"source_tracker" text NOT NULL,
	"api_url" text,
	"api_key" text,
	"api_secret" text,
	"status" text DEFAULT 'pending' NOT NULL,
	"migrate_offers" boolean DEFAULT true,
	"migrate_publishers" boolean DEFAULT true,
	"migrate_clicks" boolean DEFAULT false,
	"migrate_conversions" boolean DEFAULT true,
	"total_records" integer DEFAULT 0,
	"processed_records" integer DEFAULT 0,
	"failed_records" integer DEFAULT 0,
	"error_log" text,
	"started_at" timestamp,
	"completed_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "exchange_api_keys" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"advertiser_id" varchar NOT NULL,
	"exchange" text NOT NULL,
	"name" text NOT NULL,
	"api_key_encrypted" text NOT NULL,
	"api_secret_encrypted" text NOT NULL,
	"passphrase_encrypted" text,
	"permissions" text[],
	"ip_whitelist" text[],
	"is_active" boolean DEFAULT true NOT NULL,
	"last_used_at" timestamp,
	"last_error" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "incoming_postback_configs" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"advertiser_id" varchar NOT NULL,
	"offer_id" varchar,
	"label" text DEFAULT 'Default' NOT NULL,
	"click_id_param" text DEFAULT 'click_id' NOT NULL,
	"status_param" text DEFAULT 'status' NOT NULL,
	"payout_param" text DEFAULT 'payout' NOT NULL,
	"currency_param" text,
	"store_click_id_in" "click_id_storage" DEFAULT 'click_id' NOT NULL,
	"status_mappings" text DEFAULT '{"lead":"lead","sale":"sale","reg":"lead","dep":"sale","install":"install","rebill":"sale","approved":"sale","rejected":"rejected"}',
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "migration_history" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"advertiser_id" varchar NOT NULL,
	"source_tracker" text NOT NULL,
	"api_url" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"import_offers" boolean DEFAULT true,
	"import_publishers" boolean DEFAULT true,
	"import_conversions" boolean DEFAULT false,
	"import_clicks" boolean DEFAULT false,
	"total_records" integer DEFAULT 0,
	"processed_records" integer DEFAULT 0,
	"failed_records" integer DEFAULT 0,
	"imported_offers" integer DEFAULT 0,
	"imported_publishers" integer DEFAULT 0,
	"imported_conversions" integer DEFAULT 0,
	"imported_clicks" integer DEFAULT 0,
	"errors" text[],
	"started_at" timestamp,
	"completed_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "news_posts" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"author_id" varchar NOT NULL,
	"author_role" text NOT NULL,
	"advertiser_scope_id" varchar,
	"title" text NOT NULL,
	"body" text NOT NULL,
	"image_url" text,
	"category" text DEFAULT 'update' NOT NULL,
	"target_audience" text DEFAULT 'all' NOT NULL,
	"is_pinned" boolean DEFAULT false,
	"is_published" boolean DEFAULT true,
	"show_on_landing" boolean DEFAULT false,
	"icon" text,
	"short_description" text,
	"published_at" timestamp DEFAULT now(),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "news_reads" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"news_id" varchar NOT NULL,
	"read_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "notifications" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"sender_id" varchar,
	"sender_role" text,
	"recipient_id" varchar NOT NULL,
	"advertiser_scope_id" varchar,
	"type" text NOT NULL,
	"title" text NOT NULL,
	"body" text NOT NULL,
	"entity_type" text,
	"entity_id" varchar,
	"is_read" boolean DEFAULT false,
	"read_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "offer_access_requests" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"offer_id" varchar NOT NULL,
	"publisher_id" varchar NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"message" text,
	"rejection_reason" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "offer_caps_stats" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"offer_id" varchar NOT NULL,
	"date" text NOT NULL,
	"year_month" text DEFAULT '' NOT NULL,
	"daily_conversions" integer DEFAULT 0 NOT NULL,
	"monthly_conversions" integer DEFAULT 0 NOT NULL,
	"total_conversions" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "offer_landing_variants" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"offer_id" varchar NOT NULL,
	"name" text NOT NULL,
	"url" text NOT NULL,
	"weight" integer DEFAULT 50 NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"clicks" integer DEFAULT 0 NOT NULL,
	"conversions" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "offer_landings" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"short_id" integer,
	"offer_id" varchar NOT NULL,
	"geo" text NOT NULL,
	"landing_name" text,
	"landing_url" text NOT NULL,
	"partner_payout" numeric(10, 2) NOT NULL,
	"internal_cost" numeric(10, 2),
	"currency" text DEFAULT 'USD' NOT NULL,
	"click_id_param" text DEFAULT 'click_id' NOT NULL,
	CONSTRAINT "offer_landings_short_id_unique" UNIQUE("short_id")
);
--> statement-breakpoint
CREATE TABLE "offer_postback_settings" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"offer_id" varchar NOT NULL,
	"advertiser_id" varchar NOT NULL,
	"postback_url" text,
	"http_method" text DEFAULT 'GET',
	"send_on_lead" boolean DEFAULT true,
	"send_on_sale" boolean DEFAULT true,
	"send_on_rejected" boolean DEFAULT false,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "offer_postback_settings_offer_id_unique" UNIQUE("offer_id")
);
--> statement-breakpoint
CREATE TABLE "offers" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"short_id" integer,
	"advertiser_id" varchar NOT NULL,
	"name" text NOT NULL,
	"description" text NOT NULL,
	"logo_url" text,
	"partner_payout" numeric(10, 2),
	"internal_cost" numeric(10, 2),
	"payout_model" text DEFAULT 'CPA' NOT NULL,
	"currency" text DEFAULT 'USD' NOT NULL,
	"rev_share_percent" numeric(5, 2),
	"hold_period_days" integer DEFAULT 0,
	"geo" text[] NOT NULL,
	"category" text NOT NULL,
	"traffic_sources" text[] DEFAULT ARRAY[]::text[] NOT NULL,
	"app_types" text[] DEFAULT ARRAY[]::text[] NOT NULL,
	"creative_links" text[] DEFAULT ARRAY[]::text[] NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"is_top" boolean DEFAULT false NOT NULL,
	"is_exclusive" boolean DEFAULT false NOT NULL,
	"is_private" boolean DEFAULT false NOT NULL,
	"daily_cap" integer,
	"monthly_cap" integer,
	"total_cap" integer,
	"cap_reached_action" text DEFAULT 'block' NOT NULL,
	"cap_redirect_url" text,
	"archived" boolean DEFAULT false NOT NULL,
	"archived_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "offers_short_id_unique" UNIQUE("short_id")
);
--> statement-breakpoint
CREATE TABLE "password_reset_tokens" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"token" varchar NOT NULL,
	"expires_at" timestamp NOT NULL,
	"used_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "password_reset_tokens_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "payment_methods" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"advertiser_id" varchar NOT NULL,
	"method_type" text NOT NULL,
	"method_name" text NOT NULL,
	"currency" text NOT NULL,
	"min_payout" numeric(10, 2) DEFAULT '0' NOT NULL,
	"max_payout" numeric(10, 2),
	"fee_percent" numeric(5, 2) DEFAULT '0',
	"fee_fixed" numeric(10, 2) DEFAULT '0',
	"instructions" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "payout_requests" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"publisher_id" varchar NOT NULL,
	"advertiser_id" varchar NOT NULL,
	"wallet_id" varchar NOT NULL,
	"payment_method_id" varchar NOT NULL,
	"requested_amount" numeric(10, 2) NOT NULL,
	"approved_amount" numeric(10, 2),
	"fee_amount" numeric(10, 2) DEFAULT '0',
	"currency" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"publisher_note" text,
	"advertiser_note" text,
	"rejection_reason" text,
	"transaction_id" text,
	"paid_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "payouts" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"payout_request_id" varchar,
	"publisher_id" varchar NOT NULL,
	"advertiser_id" varchar NOT NULL,
	"payment_method_id" varchar NOT NULL,
	"wallet_address" text NOT NULL,
	"amount" numeric(10, 2) NOT NULL,
	"fee_amount" numeric(10, 2) DEFAULT '0',
	"net_amount" numeric(10, 2) NOT NULL,
	"currency" text NOT NULL,
	"payout_type" text DEFAULT 'manual' NOT NULL,
	"transaction_id" text,
	"transaction_hash" text,
	"note" text,
	"status" text DEFAULT 'completed' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "platform_api_key_usage_logs" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"api_key_id" varchar NOT NULL,
	"endpoint" text NOT NULL,
	"method" text NOT NULL,
	"ip" text,
	"user_agent" text,
	"status_code" integer,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "platform_api_keys" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"key_hash" text NOT NULL,
	"key_prefix" text NOT NULL,
	"permissions" text[] NOT NULL,
	"expires_at" timestamp,
	"is_active" boolean DEFAULT true NOT NULL,
	"last_used_at" timestamp,
	"last_used_ip" text,
	"last_used_user_agent" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"revoked_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "platform_settings" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"platform_name" text DEFAULT 'Primetrack',
	"platform_description" text,
	"platform_logo_url" text,
	"platform_favicon_url" text,
	"support_email" text,
	"support_phone" text,
	"support_telegram" text,
	"copyright_text" text,
	"default_telegram_bot_token" text,
	"allow_publisher_registration" boolean DEFAULT true,
	"allow_advertiser_registration" boolean DEFAULT true,
	"require_advertiser_approval" boolean DEFAULT true,
	"enable_proxy_detection" boolean DEFAULT true,
	"enable_vpn_detection" boolean DEFAULT true,
	"enable_fingerprint_tracking" boolean DEFAULT true,
	"max_fraud_score" integer DEFAULT 70,
	"ipinfo_token" text,
	"fingerprintjs_api_key" text,
	"stripe_public_key" text,
	"stripe_secret_key" text,
	"crypto_btc_address" text,
	"crypto_usdt_trc20_address" text,
	"crypto_eth_address" text,
	"crypto_usdt_erc20_address" text,
	"cloudflare_zone_id" text,
	"cloudflare_api_token" text,
	"cloudflare_cname_target" text,
	"cloudflare_fallback_origin" text,
	"cloudflare_worker_origin" text,
	"cloudflare_worker_secret" text,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "platform_webhook_logs" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"webhook_id" varchar NOT NULL,
	"event_type" text NOT NULL,
	"payload" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"status_code" integer,
	"response" text,
	"attempt_number" integer DEFAULT 1 NOT NULL,
	"next_retry_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "platform_webhooks" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"url" text NOT NULL,
	"events" text[] NOT NULL,
	"secret" text,
	"headers" text,
	"method" text DEFAULT 'POST' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"last_triggered_at" timestamp,
	"failed_attempts" integer DEFAULT 0 NOT NULL,
	"last_error" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "player_sessions" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"click_id" varchar,
	"player_id" text,
	"offer_id" varchar NOT NULL,
	"publisher_id" varchar NOT NULL,
	"has_click" boolean DEFAULT true NOT NULL,
	"click_at" timestamp DEFAULT now() NOT NULL,
	"has_registration" boolean DEFAULT false NOT NULL,
	"registration_at" timestamp,
	"has_ftd" boolean DEFAULT false NOT NULL,
	"ftd_at" timestamp,
	"ftd_amount" numeric(10, 2),
	"has_repeat_deposit" boolean DEFAULT false NOT NULL,
	"repeat_deposit_at" timestamp,
	"total_deposits" numeric(10, 2) DEFAULT '0',
	"deposit_count" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "postback_logs" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"conversion_id" varchar,
	"direction" "postback_direction" DEFAULT 'outbound' NOT NULL,
	"recipient_type" text DEFAULT 'advertiser' NOT NULL,
	"recipient_id" varchar,
	"offer_id" varchar,
	"publisher_id" varchar,
	"endpoint_id" varchar,
	"url" text NOT NULL,
	"method" text DEFAULT 'GET' NOT NULL,
	"request_payload" text,
	"response_code" integer,
	"response_body" text,
	"success" boolean DEFAULT false NOT NULL,
	"retry_count" integer DEFAULT 0 NOT NULL,
	"error_message" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "publisher_advertisers" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"publisher_id" varchar NOT NULL,
	"advertiser_id" varchar NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"referral_enabled" boolean DEFAULT false NOT NULL,
	"referral_rate" numeric(5, 2) DEFAULT '0',
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "publisher_balances" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"publisher_id" varchar NOT NULL,
	"advertiser_id" varchar NOT NULL,
	"available_balance" numeric(10, 2) DEFAULT '0' NOT NULL,
	"pending_balance" numeric(10, 2) DEFAULT '0' NOT NULL,
	"hold_balance" numeric(10, 2) DEFAULT '0' NOT NULL,
	"total_paid" numeric(10, 2) DEFAULT '0' NOT NULL,
	"currency" text DEFAULT 'USD' NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "publisher_invoice_items" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"invoice_id" varchar NOT NULL,
	"offer_id" varchar,
	"offer_name" text NOT NULL,
	"conversions" integer NOT NULL,
	"payout_per_conversion" numeric(10, 2) NOT NULL,
	"total_amount" numeric(10, 2) NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "publisher_invoices" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"short_id" text,
	"publisher_id" varchar NOT NULL,
	"advertiser_id" varchar NOT NULL,
	"period_start" timestamp NOT NULL,
	"period_end" timestamp NOT NULL,
	"total_amount" numeric(10, 2) NOT NULL,
	"currency" text DEFAULT 'USD' NOT NULL,
	"status" "invoice_status" DEFAULT 'draft' NOT NULL,
	"pdf_url" text,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"issued_at" timestamp,
	"paid_at" timestamp,
	CONSTRAINT "publisher_invoices_short_id_unique" UNIQUE("short_id")
);
--> statement-breakpoint
CREATE TABLE "publisher_offers" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"offer_id" varchar NOT NULL,
	"publisher_id" varchar NOT NULL,
	"approved_at" timestamp DEFAULT now() NOT NULL,
	"approved_geos" text[],
	"approved_landings" text[],
	"requested_landings" text[],
	"extension_requested_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "publisher_postback_endpoints" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"publisher_id" varchar NOT NULL,
	"offer_id" varchar,
	"label" text DEFAULT 'Default' NOT NULL,
	"tracker_type" "publisher_tracker_type" DEFAULT 'custom' NOT NULL,
	"base_url" text NOT NULL,
	"http_method" text DEFAULT 'GET' NOT NULL,
	"click_id_param" text DEFAULT 'subid' NOT NULL,
	"status_param" text DEFAULT 'status' NOT NULL,
	"payout_param" text DEFAULT 'payout' NOT NULL,
	"status_mappings" text DEFAULT '{"lead":"lead","sale":"sale","install":"install","rejected":"rejected"}',
	"custom_headers" text,
	"status_filter" text DEFAULT '["lead","sale","install"]',
	"retry_limit" integer DEFAULT 5 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "publisher_stats_cache" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"publisher_id" varchar NOT NULL,
	"advertiser_id" varchar,
	"offer_id" varchar,
	"total_clicks" integer DEFAULT 0 NOT NULL,
	"total_conversions" integer DEFAULT 0 NOT NULL,
	"approved_conversions" integer DEFAULT 0 NOT NULL,
	"rejected_conversions" integer DEFAULT 0 NOT NULL,
	"conversion_rate" numeric(5, 4),
	"approval_rate" numeric(5, 4),
	"baseline_cr" numeric(5, 4),
	"baseline_ar" numeric(5, 4),
	"is_cr_anomaly" boolean DEFAULT false,
	"is_ar_anomaly" boolean DEFAULT false,
	"last_updated" timestamp DEFAULT now() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "publisher_wallets" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"publisher_id" varchar NOT NULL,
	"advertiser_id" varchar NOT NULL,
	"payment_method_id" varchar NOT NULL,
	"wallet_address" text NOT NULL,
	"account_name" text,
	"additional_info" text,
	"is_verified" boolean DEFAULT false NOT NULL,
	"is_default" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "referral_earnings" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"referrer_id" varchar NOT NULL,
	"referred_id" varchar NOT NULL,
	"advertiser_id" varchar NOT NULL,
	"conversion_id" varchar NOT NULL,
	"amount" numeric(12, 2) NOT NULL,
	"referral_rate" numeric(5, 2) NOT NULL,
	"original_payout" numeric(12, 2) NOT NULL,
	"currency" text DEFAULT 'USD' NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "roadmap_items" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" text NOT NULL,
	"description" text NOT NULL,
	"quarter" text NOT NULL,
	"status" text DEFAULT 'planned' NOT NULL,
	"priority" integer DEFAULT 0 NOT NULL,
	"is_published" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "split_test_items" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"split_test_id" varchar NOT NULL,
	"offer_id" varchar NOT NULL,
	"landing_id" varchar,
	"weight" integer DEFAULT 50 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "split_tests" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"publisher_id" varchar NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"short_code" varchar(32) NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "split_tests_short_code_unique" UNIQUE("short_code")
);
--> statement-breakpoint
CREATE TABLE "subscription_payments" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"advertiser_id" varchar NOT NULL,
	"subscription_id" varchar,
	"plan_id" varchar,
	"amount" numeric(10, 2) NOT NULL,
	"currency" text DEFAULT 'USD' NOT NULL,
	"crypto_currency" text NOT NULL,
	"crypto_amount" numeric(18, 8),
	"crypto_address" text NOT NULL,
	"tx_hash" text,
	"tx_verified" boolean DEFAULT false,
	"tx_verified_at" timestamp,
	"status" text DEFAULT 'pending' NOT NULL,
	"billing_cycle" text DEFAULT 'monthly' NOT NULL,
	"period_start" timestamp,
	"period_end" timestamp,
	"expires_at" timestamp,
	"error_message" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "subscription_plans" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"monthly_price" numeric(10, 2) NOT NULL,
	"yearly_price" numeric(10, 2) NOT NULL,
	"max_partners" integer,
	"max_offers" integer,
	"has_antifraud" boolean DEFAULT false,
	"has_news" boolean DEFAULT false,
	"has_postbacks" boolean DEFAULT false,
	"has_team" boolean DEFAULT false,
	"has_webhooks" boolean DEFAULT false,
	"has_custom_domain" boolean DEFAULT false,
	"has_api_access" boolean DEFAULT false,
	"is_active" boolean DEFAULT true,
	"sort_order" integer DEFAULT 0,
	"price" numeric(10, 2),
	"discount_percent" integer,
	"features" text[],
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "support_conversations" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"telegram_chat_id" text NOT NULL,
	"telegram_username" text,
	"telegram_first_name" text,
	"telegram_last_name" text,
	"user_id" varchar,
	"origin" text DEFAULT 'landing' NOT NULL,
	"status" text DEFAULT 'open' NOT NULL,
	"last_message" text,
	"last_message_at" timestamp,
	"assigned_to" varchar,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "support_messages" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"conversation_id" varchar NOT NULL,
	"sender_type" text NOT NULL,
	"sender_id" varchar,
	"content" text NOT NULL,
	"telegram_message_id" integer,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_postback_settings" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"lead_postback_url" text,
	"lead_postback_method" text DEFAULT 'GET',
	"sale_postback_url" text,
	"sale_postback_method" text DEFAULT 'GET',
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp,
	CONSTRAINT "user_postback_settings_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"short_id" integer,
	"username" text NOT NULL,
	"password" text NOT NULL,
	"role" text DEFAULT 'publisher' NOT NULL,
	"email" text NOT NULL,
	"referral_code" text,
	"status" text DEFAULT 'active' NOT NULL,
	"logo_url" text,
	"telegram" text,
	"phone" text,
	"company_name" text,
	"contact_type" text,
	"contact_value" text,
	"full_name" text,
	"two_factor_enabled" boolean DEFAULT false,
	"two_factor_secret" text,
	"two_factor_setup_completed" boolean DEFAULT false,
	"telegram_chat_id" text,
	"telegram_notify_clicks" boolean DEFAULT false,
	"telegram_notify_leads" boolean DEFAULT true,
	"telegram_notify_sales" boolean DEFAULT true,
	"telegram_notify_payouts" boolean DEFAULT true,
	"telegram_notify_system" boolean DEFAULT true,
	"telegram_link_code" text,
	"telegram_link_expires" timestamp,
	"api_token" text,
	"api_token_created_at" timestamp,
	"referred_by_publisher_id" varchar,
	"referred_by_advertiser_id" varchar,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "users_short_id_unique" UNIQUE("short_id"),
	CONSTRAINT "users_username_unique" UNIQUE("username"),
	CONSTRAINT "users_email_unique" UNIQUE("email"),
	CONSTRAINT "users_referral_code_unique" UNIQUE("referral_code")
);
--> statement-breakpoint
CREATE TABLE "velocity_counters" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"counter_type" text NOT NULL,
	"counter_key" text NOT NULL,
	"advertiser_id" varchar,
	"offer_id" varchar,
	"clicks_minute" integer DEFAULT 0 NOT NULL,
	"clicks_hour" integer DEFAULT 0 NOT NULL,
	"clicks_day" integer DEFAULT 0 NOT NULL,
	"minute_reset" timestamp DEFAULT now() NOT NULL,
	"hour_reset" timestamp DEFAULT now() NOT NULL,
	"day_reset" timestamp DEFAULT now() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "webhook_endpoints" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"advertiser_id" varchar NOT NULL,
	"name" text NOT NULL,
	"url" text NOT NULL,
	"secret" text,
	"events" text[] DEFAULT '{}'::text[] NOT NULL,
	"offer_ids" text[],
	"publisher_ids" text[],
	"method" text DEFAULT 'POST' NOT NULL,
	"headers" text,
	"is_active" boolean DEFAULT true,
	"last_triggered_at" timestamp,
	"last_error" text,
	"failed_attempts" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "webhook_logs" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"webhook_endpoint_id" varchar NOT NULL,
	"advertiser_id" varchar NOT NULL,
	"event_type" text NOT NULL,
	"payload" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"status_code" integer,
	"response" text,
	"attempt_number" integer DEFAULT 1,
	"next_retry_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "acme_challenges" ADD CONSTRAINT "acme_challenges_domain_id_custom_domains_id_fk" FOREIGN KEY ("domain_id") REFERENCES "public"."custom_domains"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "advertiser_settings" ADD CONSTRAINT "advertiser_settings_advertiser_id_users_id_fk" FOREIGN KEY ("advertiser_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "advertiser_sources" ADD CONSTRAINT "advertiser_sources_advertiser_id_users_id_fk" FOREIGN KEY ("advertiser_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "advertiser_staff" ADD CONSTRAINT "advertiser_staff_advertiser_id_users_id_fk" FOREIGN KEY ("advertiser_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "advertiser_subscriptions" ADD CONSTRAINT "advertiser_subscriptions_advertiser_id_users_id_fk" FOREIGN KEY ("advertiser_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "advertiser_subscriptions" ADD CONSTRAINT "advertiser_subscriptions_plan_id_subscription_plans_id_fk" FOREIGN KEY ("plan_id") REFERENCES "public"."subscription_plans"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "antifraud_logs" ADD CONSTRAINT "antifraud_logs_click_id_clicks_id_fk" FOREIGN KEY ("click_id") REFERENCES "public"."clicks"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "antifraud_logs" ADD CONSTRAINT "antifraud_logs_offer_id_offers_id_fk" FOREIGN KEY ("offer_id") REFERENCES "public"."offers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "antifraud_logs" ADD CONSTRAINT "antifraud_logs_advertiser_id_users_id_fk" FOREIGN KEY ("advertiser_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "antifraud_logs" ADD CONSTRAINT "antifraud_logs_publisher_id_users_id_fk" FOREIGN KEY ("publisher_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "antifraud_metrics" ADD CONSTRAINT "antifraud_metrics_advertiser_id_users_id_fk" FOREIGN KEY ("advertiser_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "antifraud_metrics" ADD CONSTRAINT "antifraud_metrics_offer_id_offers_id_fk" FOREIGN KEY ("offer_id") REFERENCES "public"."offers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "antifraud_rules" ADD CONSTRAINT "antifraud_rules_advertiser_id_users_id_fk" FOREIGN KEY ("advertiser_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "clicks" ADD CONSTRAINT "clicks_offer_id_offers_id_fk" FOREIGN KEY ("offer_id") REFERENCES "public"."offers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "clicks" ADD CONSTRAINT "clicks_publisher_id_users_id_fk" FOREIGN KEY ("publisher_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "clicks" ADD CONSTRAINT "clicks_landing_id_offer_landings_id_fk" FOREIGN KEY ("landing_id") REFERENCES "public"."offer_landings"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conversion_fingerprints" ADD CONSTRAINT "conversion_fingerprints_offer_id_offers_id_fk" FOREIGN KEY ("offer_id") REFERENCES "public"."offers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conversion_fingerprints" ADD CONSTRAINT "conversion_fingerprints_advertiser_id_users_id_fk" FOREIGN KEY ("advertiser_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conversion_fingerprints" ADD CONSTRAINT "conversion_fingerprints_publisher_id_users_id_fk" FOREIGN KEY ("publisher_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conversion_fingerprints" ADD CONSTRAINT "conversion_fingerprints_conversion_id_conversions_id_fk" FOREIGN KEY ("conversion_id") REFERENCES "public"."conversions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conversion_fingerprints" ADD CONSTRAINT "conversion_fingerprints_click_id_clicks_id_fk" FOREIGN KEY ("click_id") REFERENCES "public"."clicks"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conversions" ADD CONSTRAINT "conversions_click_id_clicks_id_fk" FOREIGN KEY ("click_id") REFERENCES "public"."clicks"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conversions" ADD CONSTRAINT "conversions_offer_id_offers_id_fk" FOREIGN KEY ("offer_id") REFERENCES "public"."offers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conversions" ADD CONSTRAINT "conversions_publisher_id_users_id_fk" FOREIGN KEY ("publisher_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crypto_payout_logs" ADD CONSTRAINT "crypto_payout_logs_payout_queue_id_crypto_payout_queue_id_fk" FOREIGN KEY ("payout_queue_id") REFERENCES "public"."crypto_payout_queue"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crypto_payout_logs" ADD CONSTRAINT "crypto_payout_logs_payout_request_id_payout_requests_id_fk" FOREIGN KEY ("payout_request_id") REFERENCES "public"."payout_requests"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crypto_payout_logs" ADD CONSTRAINT "crypto_payout_logs_advertiser_id_users_id_fk" FOREIGN KEY ("advertiser_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crypto_payout_logs" ADD CONSTRAINT "crypto_payout_logs_operator_id_users_id_fk" FOREIGN KEY ("operator_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crypto_payout_queue" ADD CONSTRAINT "crypto_payout_queue_payout_request_id_payout_requests_id_fk" FOREIGN KEY ("payout_request_id") REFERENCES "public"."payout_requests"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crypto_payout_queue" ADD CONSTRAINT "crypto_payout_queue_exchange_api_key_id_exchange_api_keys_id_fk" FOREIGN KEY ("exchange_api_key_id") REFERENCES "public"."exchange_api_keys"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "custom_domains" ADD CONSTRAINT "custom_domains_advertiser_id_users_id_fk" FOREIGN KEY ("advertiser_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "data_migrations" ADD CONSTRAINT "data_migrations_advertiser_id_users_id_fk" FOREIGN KEY ("advertiser_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "exchange_api_keys" ADD CONSTRAINT "exchange_api_keys_advertiser_id_users_id_fk" FOREIGN KEY ("advertiser_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "incoming_postback_configs" ADD CONSTRAINT "incoming_postback_configs_advertiser_id_users_id_fk" FOREIGN KEY ("advertiser_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "incoming_postback_configs" ADD CONSTRAINT "incoming_postback_configs_offer_id_offers_id_fk" FOREIGN KEY ("offer_id") REFERENCES "public"."offers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "migration_history" ADD CONSTRAINT "migration_history_advertiser_id_users_id_fk" FOREIGN KEY ("advertiser_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "news_posts" ADD CONSTRAINT "news_posts_author_id_users_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "news_posts" ADD CONSTRAINT "news_posts_advertiser_scope_id_users_id_fk" FOREIGN KEY ("advertiser_scope_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "news_reads" ADD CONSTRAINT "news_reads_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "news_reads" ADD CONSTRAINT "news_reads_news_id_news_posts_id_fk" FOREIGN KEY ("news_id") REFERENCES "public"."news_posts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_sender_id_users_id_fk" FOREIGN KEY ("sender_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_recipient_id_users_id_fk" FOREIGN KEY ("recipient_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_advertiser_scope_id_users_id_fk" FOREIGN KEY ("advertiser_scope_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "offer_access_requests" ADD CONSTRAINT "offer_access_requests_offer_id_offers_id_fk" FOREIGN KEY ("offer_id") REFERENCES "public"."offers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "offer_access_requests" ADD CONSTRAINT "offer_access_requests_publisher_id_users_id_fk" FOREIGN KEY ("publisher_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "offer_caps_stats" ADD CONSTRAINT "offer_caps_stats_offer_id_offers_id_fk" FOREIGN KEY ("offer_id") REFERENCES "public"."offers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "offer_landing_variants" ADD CONSTRAINT "offer_landing_variants_offer_id_offers_id_fk" FOREIGN KEY ("offer_id") REFERENCES "public"."offers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "offer_landings" ADD CONSTRAINT "offer_landings_offer_id_offers_id_fk" FOREIGN KEY ("offer_id") REFERENCES "public"."offers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "offer_postback_settings" ADD CONSTRAINT "offer_postback_settings_offer_id_offers_id_fk" FOREIGN KEY ("offer_id") REFERENCES "public"."offers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "offer_postback_settings" ADD CONSTRAINT "offer_postback_settings_advertiser_id_users_id_fk" FOREIGN KEY ("advertiser_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "offers" ADD CONSTRAINT "offers_advertiser_id_users_id_fk" FOREIGN KEY ("advertiser_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "password_reset_tokens" ADD CONSTRAINT "password_reset_tokens_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payment_methods" ADD CONSTRAINT "payment_methods_advertiser_id_users_id_fk" FOREIGN KEY ("advertiser_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payout_requests" ADD CONSTRAINT "payout_requests_publisher_id_users_id_fk" FOREIGN KEY ("publisher_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payout_requests" ADD CONSTRAINT "payout_requests_advertiser_id_users_id_fk" FOREIGN KEY ("advertiser_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payout_requests" ADD CONSTRAINT "payout_requests_wallet_id_publisher_wallets_id_fk" FOREIGN KEY ("wallet_id") REFERENCES "public"."publisher_wallets"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payout_requests" ADD CONSTRAINT "payout_requests_payment_method_id_payment_methods_id_fk" FOREIGN KEY ("payment_method_id") REFERENCES "public"."payment_methods"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payouts" ADD CONSTRAINT "payouts_payout_request_id_payout_requests_id_fk" FOREIGN KEY ("payout_request_id") REFERENCES "public"."payout_requests"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payouts" ADD CONSTRAINT "payouts_publisher_id_users_id_fk" FOREIGN KEY ("publisher_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payouts" ADD CONSTRAINT "payouts_advertiser_id_users_id_fk" FOREIGN KEY ("advertiser_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payouts" ADD CONSTRAINT "payouts_payment_method_id_payment_methods_id_fk" FOREIGN KEY ("payment_method_id") REFERENCES "public"."payment_methods"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "platform_api_key_usage_logs" ADD CONSTRAINT "platform_api_key_usage_logs_api_key_id_platform_api_keys_id_fk" FOREIGN KEY ("api_key_id") REFERENCES "public"."platform_api_keys"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "platform_webhook_logs" ADD CONSTRAINT "platform_webhook_logs_webhook_id_platform_webhooks_id_fk" FOREIGN KEY ("webhook_id") REFERENCES "public"."platform_webhooks"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "player_sessions" ADD CONSTRAINT "player_sessions_click_id_clicks_id_fk" FOREIGN KEY ("click_id") REFERENCES "public"."clicks"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "player_sessions" ADD CONSTRAINT "player_sessions_offer_id_offers_id_fk" FOREIGN KEY ("offer_id") REFERENCES "public"."offers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "player_sessions" ADD CONSTRAINT "player_sessions_publisher_id_users_id_fk" FOREIGN KEY ("publisher_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "postback_logs" ADD CONSTRAINT "postback_logs_conversion_id_conversions_id_fk" FOREIGN KEY ("conversion_id") REFERENCES "public"."conversions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "postback_logs" ADD CONSTRAINT "postback_logs_recipient_id_users_id_fk" FOREIGN KEY ("recipient_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "postback_logs" ADD CONSTRAINT "postback_logs_offer_id_offers_id_fk" FOREIGN KEY ("offer_id") REFERENCES "public"."offers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "postback_logs" ADD CONSTRAINT "postback_logs_publisher_id_users_id_fk" FOREIGN KEY ("publisher_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "publisher_advertisers" ADD CONSTRAINT "publisher_advertisers_publisher_id_users_id_fk" FOREIGN KEY ("publisher_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "publisher_advertisers" ADD CONSTRAINT "publisher_advertisers_advertiser_id_users_id_fk" FOREIGN KEY ("advertiser_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "publisher_balances" ADD CONSTRAINT "publisher_balances_publisher_id_users_id_fk" FOREIGN KEY ("publisher_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "publisher_balances" ADD CONSTRAINT "publisher_balances_advertiser_id_users_id_fk" FOREIGN KEY ("advertiser_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "publisher_invoice_items" ADD CONSTRAINT "publisher_invoice_items_invoice_id_publisher_invoices_id_fk" FOREIGN KEY ("invoice_id") REFERENCES "public"."publisher_invoices"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "publisher_invoice_items" ADD CONSTRAINT "publisher_invoice_items_offer_id_offers_id_fk" FOREIGN KEY ("offer_id") REFERENCES "public"."offers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "publisher_invoices" ADD CONSTRAINT "publisher_invoices_publisher_id_users_id_fk" FOREIGN KEY ("publisher_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "publisher_invoices" ADD CONSTRAINT "publisher_invoices_advertiser_id_users_id_fk" FOREIGN KEY ("advertiser_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "publisher_offers" ADD CONSTRAINT "publisher_offers_offer_id_offers_id_fk" FOREIGN KEY ("offer_id") REFERENCES "public"."offers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "publisher_offers" ADD CONSTRAINT "publisher_offers_publisher_id_users_id_fk" FOREIGN KEY ("publisher_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "publisher_postback_endpoints" ADD CONSTRAINT "publisher_postback_endpoints_publisher_id_users_id_fk" FOREIGN KEY ("publisher_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "publisher_postback_endpoints" ADD CONSTRAINT "publisher_postback_endpoints_offer_id_offers_id_fk" FOREIGN KEY ("offer_id") REFERENCES "public"."offers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "publisher_stats_cache" ADD CONSTRAINT "publisher_stats_cache_publisher_id_users_id_fk" FOREIGN KEY ("publisher_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "publisher_stats_cache" ADD CONSTRAINT "publisher_stats_cache_advertiser_id_users_id_fk" FOREIGN KEY ("advertiser_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "publisher_stats_cache" ADD CONSTRAINT "publisher_stats_cache_offer_id_offers_id_fk" FOREIGN KEY ("offer_id") REFERENCES "public"."offers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "publisher_wallets" ADD CONSTRAINT "publisher_wallets_publisher_id_users_id_fk" FOREIGN KEY ("publisher_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "publisher_wallets" ADD CONSTRAINT "publisher_wallets_advertiser_id_users_id_fk" FOREIGN KEY ("advertiser_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "publisher_wallets" ADD CONSTRAINT "publisher_wallets_payment_method_id_payment_methods_id_fk" FOREIGN KEY ("payment_method_id") REFERENCES "public"."payment_methods"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "referral_earnings" ADD CONSTRAINT "referral_earnings_referrer_id_users_id_fk" FOREIGN KEY ("referrer_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "referral_earnings" ADD CONSTRAINT "referral_earnings_referred_id_users_id_fk" FOREIGN KEY ("referred_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "referral_earnings" ADD CONSTRAINT "referral_earnings_advertiser_id_users_id_fk" FOREIGN KEY ("advertiser_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "split_test_items" ADD CONSTRAINT "split_test_items_split_test_id_split_tests_id_fk" FOREIGN KEY ("split_test_id") REFERENCES "public"."split_tests"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "split_test_items" ADD CONSTRAINT "split_test_items_offer_id_offers_id_fk" FOREIGN KEY ("offer_id") REFERENCES "public"."offers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "split_test_items" ADD CONSTRAINT "split_test_items_landing_id_offer_landings_id_fk" FOREIGN KEY ("landing_id") REFERENCES "public"."offer_landings"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "split_tests" ADD CONSTRAINT "split_tests_publisher_id_users_id_fk" FOREIGN KEY ("publisher_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subscription_payments" ADD CONSTRAINT "subscription_payments_advertiser_id_users_id_fk" FOREIGN KEY ("advertiser_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subscription_payments" ADD CONSTRAINT "subscription_payments_subscription_id_advertiser_subscriptions_id_fk" FOREIGN KEY ("subscription_id") REFERENCES "public"."advertiser_subscriptions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subscription_payments" ADD CONSTRAINT "subscription_payments_plan_id_subscription_plans_id_fk" FOREIGN KEY ("plan_id") REFERENCES "public"."subscription_plans"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "support_conversations" ADD CONSTRAINT "support_conversations_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "support_conversations" ADD CONSTRAINT "support_conversations_assigned_to_users_id_fk" FOREIGN KEY ("assigned_to") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "support_messages" ADD CONSTRAINT "support_messages_conversation_id_support_conversations_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."support_conversations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_postback_settings" ADD CONSTRAINT "user_postback_settings_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_referred_by_publisher_id_users_id_fk" FOREIGN KEY ("referred_by_publisher_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_referred_by_advertiser_id_users_id_fk" FOREIGN KEY ("referred_by_advertiser_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "velocity_counters" ADD CONSTRAINT "velocity_counters_advertiser_id_users_id_fk" FOREIGN KEY ("advertiser_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "velocity_counters" ADD CONSTRAINT "velocity_counters_offer_id_offers_id_fk" FOREIGN KEY ("offer_id") REFERENCES "public"."offers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "webhook_endpoints" ADD CONSTRAINT "webhook_endpoints_advertiser_id_users_id_fk" FOREIGN KEY ("advertiser_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "webhook_logs" ADD CONSTRAINT "webhook_logs_webhook_endpoint_id_webhook_endpoints_id_fk" FOREIGN KEY ("webhook_endpoint_id") REFERENCES "public"."webhook_endpoints"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "webhook_logs" ADD CONSTRAINT "webhook_logs_advertiser_id_users_id_fk" FOREIGN KEY ("advertiser_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "advertiser_sources_advertiser_idx" ON "advertiser_sources" USING btree ("advertiser_id");--> statement-breakpoint
CREATE INDEX "clicks_offer_publisher_date_idx" ON "clicks" USING btree ("offer_id","publisher_id","created_at");--> statement-breakpoint
CREATE INDEX "clicks_publisher_date_idx" ON "clicks" USING btree ("publisher_id","created_at");--> statement-breakpoint
CREATE INDEX "clicks_offer_date_idx" ON "clicks" USING btree ("offer_id","created_at");--> statement-breakpoint
CREATE INDEX "conversions_offer_publisher_date_idx" ON "conversions" USING btree ("offer_id","publisher_id","created_at");--> statement-breakpoint
CREATE INDEX "conversions_status_date_idx" ON "conversions" USING btree ("status","created_at");--> statement-breakpoint
CREATE INDEX "conversions_click_id_idx" ON "conversions" USING btree ("click_id");--> statement-breakpoint
CREATE INDEX "conversions_publisher_date_idx" ON "conversions" USING btree ("publisher_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "daily_stats_unique_dims" ON "daily_stats" USING btree ("date","advertiser_id","publisher_id","offer_id","geo");--> statement-breakpoint
CREATE INDEX "daily_stats_advertiser_date_idx" ON "daily_stats" USING btree ("advertiser_id","date");--> statement-breakpoint
CREATE INDEX "daily_stats_publisher_date_idx" ON "daily_stats" USING btree ("publisher_id","date");--> statement-breakpoint
CREATE INDEX "offers_advertiser_idx" ON "offers" USING btree ("advertiser_id");--> statement-breakpoint
CREATE INDEX "referral_earnings_referrer_idx" ON "referral_earnings" USING btree ("referrer_id");--> statement-breakpoint
CREATE INDEX "referral_earnings_referred_idx" ON "referral_earnings" USING btree ("referred_id");--> statement-breakpoint
CREATE INDEX "referral_earnings_advertiser_idx" ON "referral_earnings" USING btree ("advertiser_id");--> statement-breakpoint
CREATE INDEX "referral_earnings_conversion_idx" ON "referral_earnings" USING btree ("conversion_id");