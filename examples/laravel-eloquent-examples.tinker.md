# Laravel Eloquent Examples

This notebook demonstrates various Laravel Eloquent operations that you can execute directly in VSCodeium using the Laravel Tinker Notebook extension.

## Basic Model Operations

Let's start with some basic Eloquent operations. Each code block below can be executed by clicking the "Run on Tinker" button that appears above it.

### Retrieving All Users

```php
// Retrieve all users from the database
$users = App\Models\User::all();

// Display as a collection
$users;
```

### Counting Records

```php
// Count the number of users
$count = App\Models\User::count();

// Display the count
echo "There are {$count} users in the database.";
```

### Finding a Specific User

```php
// Find a user by ID
$user = App\Models\User::find(1);

// Display user information
if ($user) {
    echo "User: {$user->name}\n";
    echo "Email: {$user->email}\n";
    echo "Created: {$user->created_at->format('Y-m-d')}";
} else {
    echo "User not found";
}
```
