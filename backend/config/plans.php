<?php

return [
    'free' => [
        'label' => 'უფასო',
        'max_sheets' => 5,
        'max_notes' => 15,
        'max_words' => 0,
        'can_share' => false,
        'can_password_protect' => false,
        'can_dictionary' => false,
    ],
    'pro' => [
        'label' => 'Pro',
        'max_sheets' => null,
        'max_notes' => null,
        'max_words' => null,
        'can_share' => true,
        'can_password_protect' => true,
        'can_dictionary' => true,
    ],
];
