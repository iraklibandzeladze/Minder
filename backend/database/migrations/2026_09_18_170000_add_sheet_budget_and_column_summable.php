<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('sheets', function (Blueprint $table) {
            $table->decimal('budget', 14, 2)->nullable()->after('is_default');
        });

        Schema::table('custom_columns', function (Blueprint $table) {
            $table->boolean('summable')->default(false)->after('options');
        });
    }

    public function down(): void
    {
        Schema::table('custom_columns', function (Blueprint $table) {
            $table->dropColumn('summable');
        });
        Schema::table('sheets', function (Blueprint $table) {
            $table->dropColumn('budget');
        });
    }
};
