# 异常处理

异常用于分离错误处理与正常逻辑。

## 基本语法

```cpp
#include <stdexcept>

double divide(double a, double b) {
    if (b == 0)
        throw std::runtime_error("division by zero");
    return a / b;
}

int main() {
    try {
        std::cout << divide(10, 0);
    } catch (const std::exception& e) {
        std::cerr << "Error: " << e.what();
    }
}
```

## 异常层次

```
std::exception
├── std::logic_error       (程序逻辑错误)
│   ├── std::invalid_argument
│   ├── std::out_of_range
│   └── std::length_error
└── std::runtime_error     (运行时错误)
    ├── std::range_error
    └── std::overflow_error
```

## 捕获顺序

派生类在前，基类在后：

```cpp
try { /* ... */ }
catch (const std::invalid_argument& e) { /* ... */ }
catch (const std::runtime_error& e)     { /* ... */ }
catch (const std::exception& e)         { /* ... */ }
catch (...)                             { /* 捕获所有 */ }
```

## 异常安全保证

| 级别 | 含义 |
|------|------|
| 无保证 | 操作失败后可能资源泄漏或状态损毁 |
| 基本保证 | 操作失败后对象处于有效但未指定状态 |
| 强保证 | 操作失败后回滚到操作前状态 |
| nothrow | 保证不抛异常 |

## 建议

- 按 `const` 引用捕获，避免切片
- 不在析构函数中抛异常（析构默认 `noexcept`）
- 不用异常处理普通控制流
