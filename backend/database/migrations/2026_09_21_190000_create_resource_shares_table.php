<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('resource_shares', function (Blueprint $table) {
            $table->id();
            $table->foreignId('owner_user_id')->constrained('users')->cascadeOnDelete();
            $table->string('shareable_type'); // note | sheet
            $table->unsignedBigInteger('shareable_id');
            $table->string('email');
            $table->string('role', 20); // moderator | viewer
            $table->string('status', 20)->default('pending'); // pending | accepted | revoked
            $table->string('token', 64)->unique();
            $table->foreignId('member_user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('accepted_at')->nullable();
            $table->timestamp('expires_at')->nullable();
            $table->timestamps();

            $table->index(['shareable_type', 'shareable_id']);
            $table->index(['email', 'status']);
            $table->index(['member_user_id', 'status']);
            $table->unique(['shareable_type', 'shareable_id', 'email']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('resource_shares');
    }
};
