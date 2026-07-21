# constexpr

`constexpr` 指定值或函数可在编译期求值。

## constexpr 变量

```cpp
constexpr int SIZE = 100;           // 编译期常量
constexpr double PI = 3.1415926;

int arr[SIZE];                      // OK：数组大小需要编译期常量
std::array<int, SIZE> data;         // OK：模板参数
```

比 `const` 更强：`constexpr` 保证是编译期常量，`const` 不保证。

```cpp
int x = 42;
const int a = x;       // OK：运行时 const
constexpr int b = x;   // 错误：x 不是编译期常量
```

## constexpr 函数

C++11 起函数可标记 `constexpr`，C++14 起支持更复杂的逻辑。

```cpp
constexpr int factorial(int n) {
    int result = 1;
    for (int i = 2; i <= n; i++)
        result *= i;
    return result;
}

int main() {
    constexpr int v1 = factorial(5);   // 编译期求值：120
    int x = 5;
    int v2 = factorial(x);             // 运行时求值（也可行）
}
```

`constexpr` 函数不保证一定在编译期执行——如果参数是运行期值，则在运行期执行。

## constexpr if（C++17）

编译期条件分支，未选中的分支不实例化。

```cpp
template <typename T>
auto value(T t) {
    if constexpr (std::is_pointer_v<T>)
        return *t;
    else
        return t;
}
```

比 SFINAE 简洁得多，现代 C++ 首选。

## constexpr 容器（C++20）

C++20 起 `std::vector` 和 `std::string` 可在 constexpr 上下文中使用。

## 限制

- 函数体不能有 `asm`、`goto`、`try`（C++20 放宽部分限制）
- C++14 起允许 `for`、`if`、`switch`、局部变量
- C++20 起允许虚函数调用、`dynamic_cast`、`placement new`
