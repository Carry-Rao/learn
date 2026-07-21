# 动态内存

C++ 使用 `new` 和 `delete` 手动管理堆内存。

## new / delete

```cpp
int* p = new int;       // 分配一个 int
*p = 42;
delete p;               // 释放

int* arr = new int[10]; // 分配数组
arr[0] = 1;
delete[] arr;           // 释放数组（必须用 delete[]）
```

## 注意事项

- `new` / `delete` 必须成对使用
- `new[]` / `delete[]` 必须成对使用
- 忘记 `delete` 导致内存泄漏
- 重复 `delete` 导致未定义行为

## 栈 vs 堆

| 特性 | 栈 | 堆 |
|------|-----|-----|
| 分配速度 | 快 | 慢 |
| 大小 | 小（通常几 MB） | 大（取决于系统） |
| 生命周期 | 自动管理 | 手动管理 |
| 使用 | 局部变量 | 动态大小、长生命周期 |

## nullptr

```cpp
int* p = nullptr;    // 空指针
if (p != nullptr) {
    // 安全使用
}
```

C++11 推荐用 `nullptr` 而非 `NULL`。

## 内存泄漏检测

使用 Valgrind（Linux）或 AddressSanitizer：

```bash
g++ -fsanitize=address -g main.cpp -o main
```
