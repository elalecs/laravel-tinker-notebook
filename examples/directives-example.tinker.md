# Ejemplos de Directivas en Laravel Tinker Notebook

Este archivo muestra cómo usar las diferentes directivas disponibles en el Laravel Tinker Notebook.

## Directiva @tinker-new-session

Esta directiva crea una nueva sesión de Tinker, olvidando todas las variables y estado anteriores.

```php @tinker-new-session
// Este código se ejecuta en una nueva sesión
$counter = 1;
echo "Contador iniciado: $counter";
```

## Directiva @tinker-hide-result

Esta directiva ejecuta el código pero no muestra ningún resultado.

```php @tinker-hide-result
// Este código se ejecuta pero no muestra resultado
$secretOperation = "operación secreta";
echo "Realizando $secretOperation...";
```

## Directiva @tinker-show-raw

Esta directiva muestra la salida sin ningún formato o procesamiento.

```php @tinker-show-raw
// Este código muestra la salida sin formato
$array = ['uno' => 1, 'dos' => 2, 'tres' => 3];
print_r($array);
```

## Uso de múltiples directivas

Las directivas se pueden combinar según sea necesario.

```php @tinker-new-session @tinker-show-raw
// Nueva sesión con salida sin formato
$object = new stdClass();
$object->name = "Ejemplo";
$object->value = 42;
var_dump($object);
```
