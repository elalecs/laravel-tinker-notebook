# Laravel Tinker Notebook - Ejemplo de Manejo de Sesiones

Este archivo demuestra cómo utilizar la funcionalidad de sesiones en Laravel Tinker Notebook para mantener el estado entre ejecuciones de código.

## Sesión 1: Creación y Uso de Variables

Este primer bloque creará una nueva sesión y definirá algunas variables. Usa la directiva `@tinker-new-session` para iniciar una sesión nueva.

```php
// @tinker-new-session
$userData = [
    'name' => 'John Doe',
    'email' => 'john@example.com',
    'role' => 'admin'
];

// Definir un modelo de usuario
$user = new stdClass();
$user->name = $userData['name'];
$user->email = $userData['email'];
$user->role = $userData['role'];

// La variable $user estará disponible en la sesión
echo "Usuario creado: {$user->name} ({$user->email})";
```

## Reutilización de Variables en la Misma Sesión

Este segundo bloque utilizará las variables definidas en el bloque anterior. No usa `@tinker-new-session`, por lo que continuará usando la misma sesión.

```php
// Podemos acceder a las variables definidas previamente ($user y $userData)
echo "Información del usuario: \n";
echo "Nombre: {$user->name}\n";
echo "Email: {$user->email}\n";
echo "Rol: {$user->role}\n";

// Modificar la variable existente
$user->verified = true;
$user->lastLogin = new DateTime();

var_dump($user);
```

## Crear una Segunda Sesión

Este bloque creará una nueva sesión independiente. Las variables definidas anteriormente no estarán disponibles.

```php
// @tinker-new-session
// Esta es una nueva sesión, $user no está definido aquí
$products = [
    ['id' => 1, 'name' => 'Laptop', 'price' => 1200],
    ['id' => 2, 'name' => 'Phone', 'price' => 800],
    ['id' => 3, 'name' => 'Tablet', 'price' => 500]
];

// Funcionalidad para filtrar productos
$expensiveProducts = array_filter($products, function($product) {
    return $product['price'] > 700;
});

echo "Productos caros: \n";
print_r($expensiveProducts);
```

## Especificar una Sesión Existente

Podemos usar la directiva `@tinker-use-session` para especificar que queremos usar una sesión específica. Esto es útil cuando tienes múltiples sesiones y quieres trabajar con una en particular.

```php
// @tinker-use-session:session-1
// Esto usará la primera sesión si definimos el ID correcto

// Verificamos acceso a las variables de la primera sesión
if (isset($user)) {
    echo "Usuario recuperado: {$user->name}\n";
    echo "Verificado: " . ($user->verified ? 'Sí' : 'No') . "\n";
    echo "Último login: " . $user->lastLogin->format('Y-m-d H:i:s');
} else {
    echo "El usuario no existe en esta sesión";
}
```

## Usar Directivas Adicionales

También podemos combinar directivas para controlar la salida.

```php
// @tinker-use-session:session-1
// @tinker-show-raw
// @tinker-hide-result

// Este código mostrará la salida sin procesar y no mostrará el resultado
var_dump($userData);
var_dump($user);
```

## Comandos Disponibles

Para gestionar las sesiones, puedes usar los siguientes comandos a través de la paleta de comandos (Ctrl+Shift+P o Cmd+Shift+P):

1. `Laravel Tinker: Create New Session` - Crea una nueva sesión
2. `Laravel Tinker: Close Session` - Cierra una sesión existente
3. `Laravel Tinker: Switch Session` - Cambia entre sesiones existentes
4. `Laravel Tinker: Show Session Variables` - Muestra las variables disponibles en la sesión actual

## Indicadores Visuales

La extensión muestra indicadores visuales para saber qué bloques de código están asociados con sesiones:

- Un indicador verde (▶) indica que el bloque está asociado con una sesión activa
- Un indicador gris (⏹) indica una sesión inactiva o cerrada

Pasar el ratón sobre estos indicadores mostrará un tooltip con información adicional sobre la sesión, incluyendo las variables disponibles.
