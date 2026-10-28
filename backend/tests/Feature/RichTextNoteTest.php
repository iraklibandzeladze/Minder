<?php

namespace Tests\Feature;

use App\Models\Note;
use App\Models\ResourceShare;
use App\Models\User;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class RichTextNoteTest extends TestCase
{
    protected function setUp(): void
    {
        parent::setUp();
        config(['database.default' => 'sqlite', 'database.connections.sqlite.database' => ':memory:']);

        // Exercise the real note migrations in isolation from PostgreSQL-only ledger/search migrations.
        foreach (['sheets', 'words'] as $name) {
            Schema::create($name, function (Blueprint $table) {
                $table->id();
                $table->unsignedBigInteger('user_id');
            });
        }
        foreach ([
            '0001_01_01_000000_create_users_table.php',
            '2026_09_21_160000_create_notes_tables.php',
            '2026_09_21_170000_add_platform_role_and_plan_to_users_table.php',
            '2026_09_21_180000_add_password_hash_to_notes_and_sheets.php',
            '2026_09_21_190000_create_resource_shares_table.php',
            '2026_10_15_170000_add_amount_to_note_items.php',
            '2026_10_20_120000_add_priced_to_notes.php',
        ] as $migration) {
            (require database_path('migrations/'.$migration))->up();
        }
        // An existing note must become a checklist without losing its data.
        $owner = User::factory()->create(['plan' => 'pro']);
        $legacy = $owner->notes()->create(['title' => 'ძველი', 'check_mode' => 'checkbox']);
        (require database_path('migrations/2026_10_27_120000_add_rich_text_to_notes.php'))->up();
        $this->assertSame('checklist', $legacy->fresh()->type);
        (require database_path('migrations/2026_10_28_100000_create_folders_and_item_metadata.php'))->up();
        Sanctum::actingAs($owner);
    }

    public function test_checklist_default_and_rich_text_crud(): void
    {
        $this->postJson('/api/notes', ['title' => 'სია', 'check_mode' => 'checkbox'])
            ->assertCreated()->assertJsonPath('data.type', 'checklist')->assertJsonCount(1, 'data.items');

        $html = '<h1>სათაური</h1><p><strong>ტექსტი</strong></p>';
        $created = $this->postJson('/api/notes', [
            'title' => 'დოკუმენტი', 'check_mode' => 'checkbox', 'type' => 'rich_text', 'content' => $html, 'priced' => true,
        ])->assertCreated()->assertJsonPath('data.content', $html)->assertJsonPath('data.priced', false)
            ->assertJsonCount(0, 'data.items');
        $id = $created->json('data.id');
        $this->putJson("/api/notes/{$id}", ['content' => '<p>შეცვლილი</p>'])
            ->assertOk()->assertJsonPath('data.content', '<p>შეცვლილი</p>');
        $this->assertSame('<p>შეცვლილი</p>', Note::findOrFail($id)->content);
        $this->putJson("/api/notes/{$id}", ['content' => ''])->assertOk();
        $this->assertContains($id, array_column($this->getJson('/api/notes')->assertOk()->json('data'), 'id'));
        $this->deleteJson("/api/notes/{$id}")->assertOk();
        $this->assertDatabaseMissing('notes', ['id' => $id]);
    }

    public function test_validation_and_ownership(): void
    {
        $this->postJson('/api/notes', ['title' => 'ნოუთი', 'check_mode' => 'checkbox', 'type' => 'invalid'])
            ->assertUnprocessable()->assertJsonValidationErrors('type');
        $other = User::factory()->create();
        $note = $other->notes()->create(['title' => 'სხვისი', 'type' => 'rich_text']);
        $this->putJson("/api/notes/{$note->id}", ['content' => '<p>არა</p>'])->assertForbidden();
        $this->putJson('/api/notes/1', ['content' => ['invalid']])->assertUnprocessable();
    }

    public function test_locked_content_is_hidden_and_cannot_be_overwritten_until_unlock(): void
    {
        $created = $this->postJson('/api/notes', [
            'title' => 'დაცული', 'check_mode' => 'checkbox', 'type' => 'rich_text', 'content' => '<p>საიდუმლო</p>',
            'password_protected' => true, 'password' => 'secret', 'password_confirmation' => 'secret',
        ])->assertCreated()->assertJsonPath('data.content', null);
        $id = $created->json('data.id');
        $this->putJson("/api/notes/{$id}", ['content' => 'overwrite'])->assertStatus(423);
        $this->postJson("/api/notes/{$id}/unlock", ['password' => 'secret'])
            ->assertOk()->assertJsonPath('data.content', '<p>საიდუმლო</p>');
        $this->putJson("/api/notes/{$id}", ['content' => '<p>ახალი</p>'])->assertOk();
        $this->postJson("/api/notes/{$id}/lock")->assertOk()->assertJsonPath('data.content', null);
    }

    public function test_shared_viewer_can_read_but_cannot_edit(): void
    {
        $owner = auth()->user();
        $note = $owner->notes()->create(['title' => 'გაზიარებული', 'type' => 'rich_text', 'content' => '<p>ტექსტი</p>']);
        $viewer = User::factory()->create();
        ResourceShare::create([
            'owner_user_id' => $owner->id, 'shareable_type' => 'note', 'shareable_id' => $note->id,
            'email' => $viewer->email, 'member_user_id' => $viewer->id, 'role' => 'viewer',
            'status' => 'accepted', 'token' => 'test-token',
        ]);
        Sanctum::actingAs($viewer);
        $this->getJson('/api/notes')->assertOk()->assertJsonPath('data.0.content', '<p>ტექსტი</p>');
        $this->putJson("/api/notes/{$note->id}", ['content' => 'overwrite'])->assertForbidden();
    }
}
