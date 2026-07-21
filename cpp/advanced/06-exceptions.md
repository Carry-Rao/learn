# 异常处理

异常用于处理运行时错误。

## 基本语法

```cpp
#include <iostream>
#include <stdexcept>

double divide(double a, double b) {
    if (b == 0) {
        throw std::runtime_error("division by zero");
    }
    return a / b;
}

int main() {
    try {
        double result = divide(10, 0);
        std::cout << result << std::endl;
    } catch (const std::exception& e) {
        std::cerr << "Error: " << e.what() << std::endl;
    }
}
```

## 标准异常类

```
std::exception
├── std::logic_error
│   ├── std::invalid_argument
│   ├── std::out_of_range
│   └── std::length_error
└── std::runtime_error
    ├── std::range_error
    └── std::overflow_error
```

## 捕获多个异常

```cpp
try {
    // ...
} catch (const std::invalid_argument& e) {
    // 处理参数错误
} catch (const std::runtime_error& e) {
    // 处理运行时错误
} catch (...) {
    // 捕获所有异常
}
```

## noexcept

C++11 标记函数不抛异常：

```cpp
void func() noexcept;    // 保证不抛异常
void func() noexcept(false);  // 可能抛异常
```

如果 `noexcept` 函数抛出异常，程序直接终止。

## 异常安全

| 级别 | 说明 |
|------|------|
| 无保证 | 操作失败后可能资源泄漏 |
| 基本保证 | 操作失败后对象处于有效但未指定状态 |
| 强保证 | 操作失败后回滚到操作前状态 |
| 不抛异常 | 保证永不抛异常（如析构函数、swap） |

## 建议

- 不要用异常处理普通控制流
- 析构函数不要抛出异常
- 按 const 引用捕获异常
