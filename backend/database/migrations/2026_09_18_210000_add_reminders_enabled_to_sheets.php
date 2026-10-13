<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('sheets', function (Blueprint $table) {
            $table->boolean('reminders_enabled')->default(false)->after('budget');
        });
    }

    public function down(): void
    {
        Schema::table('sheets', function (Blueprint $table) {
            $table->dropColumn('reminders_enabled');
        });
    }
};
