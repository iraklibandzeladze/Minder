<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('transactions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->foreignId('account_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('category_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('related_account_id')->nullable()->constrained('accounts')->nullOnDelete();
            $table->foreignId('template_id')->nullable()->constrained('recurring_templates')->nullOnDelete();
            $table->string('type')->default('expense'); // expense, income, transfer
            $table->decimal('amount', 14, 2);
            $table->decimal('amount_paid', 14, 2)->default(0);
            $table->string('currency', 8)->default('GEL');
            $table->string('status')->default('pending'); // paid, pending, partial
            $table->date('occurred_on');
            $table->string('year_month', 7);
            $table->string('title');
            $table->text('notes')->nullable();
            $table->jsonb('custom_fields')->default(DB::raw("'{}'::jsonb"));
            $table->timestamps();

            $table->index(['user_id', 'occurred_on']);
            $table->index(['user_id', 'status']);
            $table->index(['user_id', 'year_month']);
            $table->unique(['template_id', 'year_month']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('transactions');
    }
};
