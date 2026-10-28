<?php

namespace Tests\Feature;

use App\Models\Folder;
use App\Models\ResourceShare;
use App\Models\User;
use Illuminate\Auth\Notifications\ResetPassword;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Facades\Password;
use Illuminate\Support\Facades\Schema;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class WorkspaceLifecycleTest extends TestCase
{
    protected User $owner;

    protected function setUp(): void
    {
        parent::setUp();
        config(['database.default' => 'sqlite', 'database.connections.sqlite.database' => ':memory:']);
        Schema::create('sheets', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('user_id');
            $table->string('name');
            $table->string('slug')->default('table');
            $table->string('kind')->default('table');
            $table->integer('position')->default(0);
            $table->boolean('is_default')->default(false);
            $table->decimal('budget')->nullable();
            $table->boolean('reminders_enabled')->default(false);
            $table->timestamps();
        });
        Schema::create('words', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('user_id');
        });
        foreach ([
            '0001_01_01_000000_create_users_table.php', '2026_09_21_170000_add_platform_role_and_plan_to_users_table.php',
            '2026_09_21_160000_create_notes_tables.php', '2026_09_21_180000_add_password_hash_to_notes_and_sheets.php',
            '2026_09_21_190000_create_resource_shares_table.php', '2026_10_15_170000_add_amount_to_note_items.php',
            '2026_10_20_120000_add_priced_to_notes.php', '2026_10_27_120000_add_rich_text_to_notes.php',
            '2026_10_28_100000_create_folders_and_item_metadata.php',
        ] as $file) {
            (require database_path('migrations/'.$file))->up();
        }
        $this->owner = User::factory()->create(['plan' => 'pro', 'password' => 'account-password']);
        Sanctum::actingAs($this->owner);
    }

    public function test_folder_lifecycle_and_preserving_delete(): void
    {
        $root = $this->postJson('/api/folders', ['name' => 'მთავარი', 'type' => 'notes'])->assertCreated()->json('data.id');
        $child = $this->postJson('/api/folders', ['name' => 'შვილი', 'type' => 'notes', 'parent_id' => $root])->assertCreated()->json('data.id');
        $this->putJson("/api/folders/{$child}", ['name' => 'შეცვლილი'])->assertOk()->assertJsonPath('data.name', 'შეცვლილი');
        $this->putJson("/api/folders/{$root}", ['parent_id' => $child])->assertUnprocessable();
        $this->putJson("/api/folders/{$root}", ['parent_id' => $root])->assertUnprocessable();
        $note = $this->postJson('/api/notes', ['title' => 'ტექსტი', 'check_mode' => 'checkbox', 'type' => 'rich_text', 'content' => '<p>ქართული</p>', 'priced' => true])->assertCreated()->assertJsonPath('data.priced', false)->json('data.id');
        $this->putJson("/api/notes/{$note}", ['folder_id' => $child, 'is_pinned' => true])->assertOk()->assertJsonPath('data.is_pinned', true);
        $this->getJson('/api/notes')->assertOk()->assertJsonPath('data.0.folder_id', $child)->assertJsonStructure(['data' => [['created_at', 'updated_at']]]);
        $this->deleteJson("/api/folders/{$root}", ['delete_contents' => false])->assertOk();
        $this->assertDatabaseCount('folders', 0);
        $this->assertDatabaseHas('notes', ['id' => $note, 'folder_id' => null, 'content' => '<p>ქართული</p>']);
        $tables = $this->postJson('/api/folders', ['name' => 'ცხრილები', 'type' => 'tables'])->json('data.id');
        $sheet = $this->owner->sheets()->create(['name' => 'ხარჯები']);
        $this->putJson("/api/sheets/{$sheet->id}", ['folder_id' => $tables])->assertOk()->assertJsonPath('data.folder_id', $tables);
        $this->putJson("/api/notes/{$note}", ['folder_id' => $tables])->assertUnprocessable();
        $this->deleteJson("/api/folders/{$tables}", ['delete_contents' => false])->assertOk();
        $this->assertNull($sheet->fresh()->folder_id);
    }

    public function test_foreign_folders_are_inaccessible(): void
    {
        $other = User::factory()->create();
        $folder = Folder::create(['user_id' => $other->id, 'type' => 'notes', 'name' => 'სხვისი']);
        $this->getJson('/api/folders')->assertOk()->assertJsonPath('data', []);
        $this->putJson("/api/folders/{$folder->id}", ['name' => 'არა'])->assertForbidden();
        $this->deleteJson("/api/folders/{$folder->id}", ['delete_contents' => false])->assertForbidden();
        $this->postJson('/api/folders', ['name' => 'არა', 'type' => 'notes', 'parent_id' => $folder->id])->assertUnprocessable();
        $note = $this->owner->notes()->create(['title' => 'ჩემი']);
        $this->putJson("/api/notes/{$note->id}", ['folder_id' => $folder->id])->assertUnprocessable();
    }

    public function test_recursive_delete_requires_main_password(): void
    {
        $root = Folder::create(['user_id' => $this->owner->id, 'type' => 'notes', 'name' => 'მთავარი']);
        $child = Folder::create(['user_id' => $this->owner->id, 'type' => 'notes', 'name' => 'შვილი', 'parent_id' => $root->id]);
        $note = $this->owner->notes()->create(['title' => 'დაცული', 'folder_id' => $child->id, 'password_hash' => Hash::make('note-password')]);
        $outside = $this->owner->notes()->create(['title' => 'სხვა']);
        $this->deleteJson("/api/folders/{$root->id}", ['delete_contents' => true, 'account_password' => 'wrong'])->assertUnprocessable();
        $this->assertDatabaseHas('notes', ['id' => $note->id]);
        $this->deleteJson("/api/folders/{$root->id}", ['delete_contents' => true, 'account_password' => 'account-password'])->assertOk();
        $this->assertDatabaseMissing('notes', ['id' => $note->id]);
        $this->assertDatabaseHas('notes', ['id' => $outside->id]);
        $this->assertDatabaseCount('folders', 0);
    }

    public function test_password_token_reset_replay_and_expiration(): void
    {
        Notification::fake();
        $response = $this->postJson('/api/forgot-password', ['email' => $this->owner->email])->assertOk()->json();
        $this->postJson('/api/forgot-password', ['email' => 'unknown@example.com'])->assertOk()->assertExactJson($response);
        $token = '';
        Notification::assertSentTo($this->owner, ResetPassword::class, function ($notification) use (&$token) {
            $token = $notification->token;
            $this->assertStringContainsString('/reset-password?', $notification->toMail($this->owner)->actionUrl);

            return true;
        });
        $payload = ['email' => $this->owner->email, 'token' => $token, 'password' => 'new-password', 'password_confirmation' => 'new-password'];
        $this->postJson('/api/reset-password', [...$payload, 'token' => 'invalid'])->assertUnprocessable();
        $this->postJson('/api/reset-password', $payload)->assertOk();
        $this->assertTrue(Hash::check('new-password', $this->owner->fresh()->password));
        $this->postJson('/api/reset-password', $payload)->assertUnprocessable();
        $token = Password::createToken($this->owner);
        $this->travel(61)->minutes();
        $this->postJson('/api/reset-password', [...$payload, 'token' => $token])->assertUnprocessable();
    }

    public function test_table_recovery_requires_owner_and_main_password(): void
    {
        $sheet = $this->owner->sheets()->create(['name' => 'დაცული', 'password_hash' => Hash::make('table-password')]);
        $this->postJson("/api/sheets/{$sheet->id}/recover-password", ['account_password' => 'table-password'])->assertUnprocessable();
        $this->assertNotNull($sheet->fresh()->password_hash);
        Sanctum::actingAs(User::factory()->create());
        $this->postJson("/api/sheets/{$sheet->id}/recover-password", ['account_password' => 'account-password'])->assertForbidden();
        Sanctum::actingAs($this->owner);
        $this->postJson("/api/sheets/{$sheet->id}/recover-password", ['account_password' => 'account-password'])->assertOk()->assertJsonPath('data.is_locked', false);
        $this->assertNull($sheet->fresh()->password_hash);
    }

    public function test_deleted_table_folder_removes_its_contents_only_after_confirmation(): void
    {
        $folder = Folder::create(['user_id' => $this->owner->id, 'type' => 'tables', 'name' => 'ცხრილები']);
        $sheet = $this->owner->sheets()->create(['name' => 'შიგნით', 'folder_id' => $folder->id]);
        $outside = $this->owner->sheets()->create(['name' => 'გარეთ']);
        $this->deleteJson("/api/folders/{$folder->id}", ['delete_contents' => true])->assertUnprocessable();
        $this->assertDatabaseHas('sheets', ['id' => $sheet->id]);
        $this->deleteJson("/api/folders/{$folder->id}", ['delete_contents' => true, 'account_password' => 'account-password'])->assertOk();
        $this->assertDatabaseMissing('sheets', ['id' => $sheet->id]);
        $this->assertDatabaseHas('sheets', ['id' => $outside->id]);
    }

    public function test_shared_editor_cannot_reorganize_owner_items_or_recover_table_password(): void
    {
        $editor = User::factory()->create();
        $sheet = $this->owner->sheets()->create(['name' => 'გაზიარებული', 'password_hash' => Hash::make('table-password')]);
        ResourceShare::create([
            'owner_user_id' => $this->owner->id, 'shareable_type' => 'sheet', 'shareable_id' => $sheet->id,
            'email' => $editor->email, 'role' => 'moderator', 'status' => 'accepted',
            'token' => 'share-test-token', 'member_user_id' => $editor->id,
        ]);
        Sanctum::actingAs($editor);
        $this->putJson("/api/sheets/{$sheet->id}", ['folder_id' => null])->assertForbidden();
        $this->putJson("/api/sheets/{$sheet->id}", ['is_pinned' => true])->assertForbidden();
        $this->postJson("/api/sheets/{$sheet->id}/recover-password", ['account_password' => 'account-password'])->assertForbidden();
        $this->assertNotNull($sheet->fresh()->password_hash);
    }

    public function test_recovery_endpoints_are_rate_limited(): void
    {
        Notification::fake();
        for ($i = 0; $i < 5; $i++) {
            $this->postJson('/api/forgot-password', ['email' => 'missing@example.com'])->assertOk();
        }
        $this->postJson('/api/forgot-password', ['email' => 'missing@example.com'])->assertStatus(429);
    }

    public function test_account_reset_invalidates_existing_database_sessions(): void
    {
        config(['session.driver' => 'database']);
        DB::table('sessions')->insert([
            'id' => 'old-user-session', 'user_id' => $this->owner->id,
            'payload' => base64_encode(serialize([])), 'last_activity' => time(),
        ]);
        $token = Password::createToken($this->owner);
        $remember = $this->owner->remember_token;
        $this->postJson('/api/reset-password', [
            'email' => $this->owner->email, 'token' => $token,
            'password' => 'replacement-password', 'password_confirmation' => 'replacement-password',
        ])->assertOk();
        $this->assertDatabaseMissing('sessions', ['id' => 'old-user-session']);
        $this->assertNotSame($remember, $this->owner->fresh()->remember_token);
    }
}
