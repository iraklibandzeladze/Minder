<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Folder extends Model
{
    protected $fillable = ['user_id', 'name', 'type', 'parent_id'];

    protected function casts(): array
    {
        return ['parent_id' => 'integer'];
    }
}
