<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('custom_columns', function (Blueprint $table) {
            $table->dropUnique(['user_id', 'slug']);
        });

        Schema::table('custom_columns', function (Blueprint $table) {
            $table->unique(['sheet_id', 'slug']);
        });
    }

    public function down(): void
    {
        Schema::table('custom_columns', function (Blueprint $table) {
            $table->dropUnique(['sheet_id', 'slug']);
        });

        Schema::table('custom_columns', function (Blueprint $table) {
            $table->unique(['user_id', 'slug']);
        });
    }
};
