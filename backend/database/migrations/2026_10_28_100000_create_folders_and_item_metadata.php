<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('folders', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('name', 120);
            $table->enum('type', ['notes', 'tables']);
            $table->foreignId('parent_id')->nullable()->constrained('folders')->nullOnDelete();
            $table->timestamps();
            $table->index(['user_id', 'type', 'parent_id']);
        });
        foreach (['notes', 'sheets'] as $name) {
            Schema::table($name, function (Blueprint $table) {
                $table->foreignId('folder_id')->nullable()->constrained()->nullOnDelete();
                $table->boolean('is_pinned')->default(false);
            });
        }
    }

    public function down(): void
    {
        foreach (['notes', 'sheets'] as $name) {
            Schema::table($name, function (Blueprint $table) {
                $table->dropConstrainedForeignId('folder_id');
                $table->dropColumn('is_pinned');
            });
        }
        Schema::dropIfExists('folders');
    }
};
