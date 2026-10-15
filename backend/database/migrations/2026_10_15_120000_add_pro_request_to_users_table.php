<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->timestamp('pro_requested_at')->nullable()->after('plan');
            $table->string('pro_request_note', 500)->nullable()->after('pro_requested_at');
            $table->index('pro_requested_at');
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropIndex(['pro_requested_at']);
            $table->dropColumn(['pro_requested_at', 'pro_request_note']);
        });
    }
};
