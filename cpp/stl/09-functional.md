# std::function 与函数式工具

`<functional>` 头文件提供函数包装器、绑定器和函数式编程工具。

## std::function

通用多态函数包装器，可存储任意可调用对象。

```cpp
#include <functional>

int add(int a, int b) { return a + b; }

struct Mul {
    int operator()(int a, int b) const { return a * b; }
};

int main() {
    std::function<int(int, int)> f;

    f = add;                     // 函数指针
    std::cout << f(3, 5);        // 8

    f = Mul();                   // 函数对象
    std::cout << f(3, 5);        // 15

    f = [](int a, int b) {       // lambda
        return a - b;
    };
    std::cout << f(3, 5);        // -2
}
```

## std::bind

绑定参数生成新的可调用对象（C++11，C++17 起建议用 lambda）。

```cpp
void printSum(int a, int b, int c) {
    std::cout << a + b + c;
}

auto f = std::bind(printSum, 1, 2, 3);
f();  // 6

// 占位符
using namespace std::placeholders;
auto g = std::bind(printSum, _1, 10, _2);
g(5, 20);  // 5 + 10 + 20 = 35
```

## std::invoke（C++17）

统一调用任意可调用对象。

```cpp
std::invoke(func, args...);       // 等价于 func(args...)
std::invoke(&T::method, obj, a);  // 等价于 obj.method(a)
std::invoke(&T::field, obj);      // 等价于 obj.field
```

## std::mem_fn

成员函数包装器。

```cpp
struct Point { double x, y; };

std::vector<Point> pts = {{1.0, 2.0}, {3.0, 4.0}};
std::vector<double> xs;
std::transform(pts.begin(), pts.end(), std::back_inserter(xs),
               std::mem_fn(&Point::x));
// xs = {1.0, 3.0}
```

## 常用函数对象

`<functional>` 内置的算数、比较、逻辑函数对象。

```cpp
std::plus<int>{}       // +
std::minus<int>{}      // -
std::multiplies<int>{} // *
std::divides<int>{}    // /
std::modulus<int>{}    // %
std::negate<int>{}     // -

std::equal_to<int>{}   // ==
std::not_equal_to<int>{} // !=
std::greater<int>{}    // >
std::less<int>{}       // <
```

用于算法中：

```cpp
std::sort(v.begin(), v.end(), std::greater<int>{});  // 降序
int sum = std::accumulate(v.begin(), v.end(), 0, std::plus<int>{});
```

## 建议

- 优先 lambda 而非 `std::bind`（可读性更好）
- `std::function` 有轻微运行时开销（虚函数调用），非性能关键路径可用
- 模板或 auto 参数可替代 `std::function`，避免类型擦除开销
