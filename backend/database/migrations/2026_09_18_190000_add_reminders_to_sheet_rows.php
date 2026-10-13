<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('sheet_rows', function (Blueprint $table) {
            $table->timestamp('reminder_at')->nullable()->after('notes');
            $table->timestamp('reminder_sent_at')->nullable()->after('reminder_at');
            $table->index(['reminder_at', 'reminder_sent_at']);
        });
    }

    public function down(): void
    {
        Schema::table('sheet_rows', function (Blueprint $table) {
            $table->dropIndex(['reminder_at', 'reminder_sent_at']);
            $table->dropColumn(['reminder_at', 'reminder_sent_at']);
        });
    }
};
