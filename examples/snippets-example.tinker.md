# Laravel Tinker Snippets - Usage Guide

This document explains how to use the Laravel Tinker Snippet Library feature, which allows you to save, organize, and reuse code snippets across your Laravel projects.

## Using the Snippet Library

The Laravel Tinker Notebook extension includes a Snippet Library that you can access from the Explorer sidebar. Here's how to use it:

1. Open the Snippet Library view from the Explorer sidebar (look for the "Laravel Tinker Snippets" item)
2. Create snippets by selecting code and using the context menu or the "Create Snippet from Selection" command
3. Organize snippets into categories
4. Insert snippets directly into your code
5. Export and import snippets to share them across projects

## Creating Snippets

You can create snippets in several ways:

### From Selection

1. Select a block of code in the editor
2. Right-click and select "Laravel Tinker: Create Snippet from Selection"
3. Fill in the details (name, description, tags, category)

```php
// Select this code and create a snippet from it
$users = \App\Models\User::where('active', true)
    ->orderBy('name')
    ->get();

foreach ($users as $user) {
    echo $user->name . ' - ' . $user->email . "\n";
}
```

### From the Snippet Library View

1. Click the "New Snippet" button in the Snippet Library view
2. Enter the snippet details and code

## Example Snippets

Here are some examples of useful Laravel snippets that you might want to save:

### Database Query Example

```php
// Get latest users with specific role
$users = \App\Models\User::where('role', 'admin')
    ->orderBy('created_at', 'desc')
    ->limit(10)
    ->get();

foreach ($users as $user) {
    dump([
        'id' => $user->id,
        'name' => $user->name,
        'email' => $user->email,
        'created' => $user->created_at->format('Y-m-d H:i')
    ]);
}
```

### Eloquent Relationship Example

```php
// Get all posts with their authors and comments
$posts = \App\Models\Post::with(['author', 'comments'])
    ->where('published', true)
    ->orderBy('published_at', 'desc')
    ->limit(5)
    ->get();

foreach ($posts as $post) {
    echo "Post: {$post->title}\n";
    echo "Author: {$post->author->name}\n";
    echo "Comments: {$post->comments->count()}\n";
    echo "---------------\n";
}
```

### Cache Example

```php
// Using cache to store expensive operations
$data = \Illuminate\Support\Facades\Cache::remember('dashboard-stats', 3600, function () {
    // This will only be executed if the cache doesn't exist or has expired
    return [
        'users_count' => \App\Models\User::count(),
        'posts_count' => \App\Models\Post::where('published', true)->count(),
        'latest_signups' => \App\Models\User::latest()->take(5)->get(),
        'popular_posts' => \App\Models\Post::orderBy('views', 'desc')->take(5)->get()
    ];
});

dump($data);
```

## Organizing Snippets

Snippets are organized by categories. When creating a snippet, you can assign it to an existing category or create a new one.

Common categories might include:
- Models
- Controllers
- Database Queries
- Authentication
- API
- Testing

## Exporting and Importing Snippets

You can export your snippets to share them with team members or use them in other projects:

1. Click the "Export" button in the Snippet Library view
2. Choose a location to save the JSON file

To import snippets:

1. Click the "Import" button in the Snippet Library view
2. Select a previously exported JSON file

## Tips for Effective Snippet Management

1. **Use descriptive names**: Make your snippet names clear and specific
2. **Add relevant tags**: Tags make it easier to find snippets later
3. **Keep snippets focused**: Each snippet should do one thing well
4. **Update regularly**: Keep your snippets up-to-date with your coding practices
5. **Share with your team**: Export useful snippets for your colleagues
