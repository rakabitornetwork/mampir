<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('customers', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('username')->unique();
            $table->string('password')->nullable();
            $table->string('email')->nullable();
            $table->string('phone')->nullable();
            $table->string('company')->nullable();
            $table->text('notes')->nullable();
            $table->string('status')->default('active'); // active, expired, suspended, draft
            $table->boolean('synced_from_chr')->default(false);
            $table->timestamp('starts_at')->nullable();
            $table->timestamp('expires_at')->nullable();
            $table->unsignedInteger('duration_days')->nullable();
            $table->timestamp('last_synced_at')->nullable();
            $table->timestamps();
        });

        Schema::create('tunnels', function (Blueprint $table) {
            $table->id();
            $table->foreignId('customer_id')->constrained()->cascadeOnDelete();
            $table->string('service')->default('l2tp'); // l2tp, ovpn
            $table->string('profile')->default('default-encryption');
            $table->string('local_address')->default('192.168.172.254');
            $table->string('remote_address')->unique();
            $table->unsignedSmallInteger('port_block')->nullable();
            $table->boolean('chr_enabled')->default(true);
            $table->boolean('is_online')->default(false);
            $table->string('caller_id')->nullable();
            $table->string('uptime')->nullable();
            $table->timestamp('last_seen_at')->nullable();
            $table->json('meta')->nullable();
            $table->timestamps();
        });

        Schema::create('port_forwards', function (Blueprint $table) {
            $table->id();
            $table->foreignId('tunnel_id')->constrained()->cascadeOnDelete();
            $table->string('label');
            $table->string('service_key')->nullable(); // ssh, http, olt, winbox, api, custom
            $table->unsignedInteger('public_port');
            $table->unsignedInteger('public_port_end')->nullable();
            $table->unsignedInteger('local_port');
            $table->unsignedInteger('local_port_end')->nullable();
            $table->string('protocol')->default('tcp');
            $table->string('comment')->nullable();
            $table->boolean('enabled')->default(true);
            $table->boolean('synced_from_chr')->default(false);
            $table->timestamps();

            $table->unique(['public_port', 'protocol']);
        });

        Schema::create('subscription_plans', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('slug')->unique();
            $table->unsignedInteger('duration_days');
            $table->decimal('price', 12, 2)->default(0);
            $table->string('currency', 8)->default('IDR');
            $table->text('description')->nullable();
            $table->boolean('is_active')->default(true);
            $table->unsignedInteger('sort_order')->default(0);
            $table->timestamps();
        });

        Schema::create('subscriptions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('customer_id')->constrained()->cascadeOnDelete();
            $table->foreignId('subscription_plan_id')->nullable()->constrained()->nullOnDelete();
            $table->unsignedInteger('duration_days');
            $table->timestamp('starts_at');
            $table->timestamp('expires_at');
            $table->string('status')->default('active'); // active, expired, cancelled
            $table->decimal('amount', 12, 2)->nullable();
            $table->text('notes')->nullable();
            $table->timestamps();
        });

        Schema::create('app_settings', function (Blueprint $table) {
            $table->id();
            $table->string('key')->unique();
            $table->text('value')->nullable();
            $table->timestamps();
        });

        Schema::create('sync_logs', function (Blueprint $table) {
            $table->id();
            $table->string('type'); // pull, push, expire
            $table->string('status'); // success, failed
            $table->unsignedInteger('customers_synced')->default(0);
            $table->unsignedInteger('ports_synced')->default(0);
            $table->text('message')->nullable();
            $table->json('payload')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('sync_logs');
        Schema::dropIfExists('app_settings');
        Schema::dropIfExists('subscriptions');
        Schema::dropIfExists('subscription_plans');
        Schema::dropIfExists('port_forwards');
        Schema::dropIfExists('tunnels');
        Schema::dropIfExists('customers');
    }
};
