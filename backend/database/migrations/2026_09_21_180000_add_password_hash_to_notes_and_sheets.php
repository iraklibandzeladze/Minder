<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('notes', function (Blueprint $table) {
            $table->string('password_hash')->nullable()->after('position');
        });

        Schema::table('sheets', function (Blueprint $table) {
            $table->string('password_hash')->nullable()->after('reminders_enabled');
        });
    }

    public function down(): void
    {
        Schema::table('notes', function (Blueprint $table) {
            $table->dropColumn('password_hash');
        });

        Schema::table('sheets', function (Blueprint $table) {
            $table->dropColumn('password_hash');
        });
    }
};
