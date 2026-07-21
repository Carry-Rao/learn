# 编译器优化

编译器在不改变程序语义的前提下，会对代码进行各种优化。

## RVO（返回值优化）

编译器直接在被调用者的栈上构造返回值，避免拷贝。

```cpp
std::vector<int> create() {
    std::vector<int> v(1000000);
    return v;  // 不会拷贝！编译器直接在调用方栈上构造
}

auto vec = create();  // 零拷贝
```

C++17 起，`return T(...)` 形式的纯右值返回是**强制性 RVO**（guaranteed copy elision）。

## NRVO（命名返回值优化）

RVO 的变体，返回值有名字时同样可省略拷贝。

```cpp
std::string getMessage() {
    std::string result = "Hello";
    result += " World";
    return result;  // NRVO：直接在调用方构造 result
}
```

NRVO 是**可选的**，编译器不保证一定执行。复杂控制流（如多个返回点）可能阻止 NRVO。

## 何时失效

```cpp
std::string choose(bool flag) {
    std::string a = "foo";
    std::string b = "bar";
    if (flag) return a;  // 多个返回路径 → 难以 NRVO
    else      return b;
}

// 此时用 std::move 显式转移
if (flag) return std::move(a);
else      return std::move(b);
```

## 循环展开

将循环体复制多份，减少循环控制开销。

```cpp
// 原始
for (int i = 0; i < 4; i++)
    sum += arr[i];

// 优化后（展开）
sum += arr[0];
sum += arr[1];
sum += arr[2];
sum += arr[3];
```

现代编译器自动决定是否展开以及展开因子。通常不需要手动展开。

## 内联

函数调用被替换为函数体本身，消除调用开销。

```cpp
inline int square(int x) { return x * x; }
// square(5) → 5 * 5
```

`inline` 只是建议，编译器自行决定。小函数更可能被内联，虚函数和递归函数不行。

## copy elision 全览

C++17 保证以下几种场景的拷贝省略：

| 场景 | 说明 |
|------|------|
| `return T(...)` | 返回纯右值 |
| `T x = T(...)` | 用纯右值初始化 |
| `throw T(...)` | 抛纯右值异常 |
| `catch (T e)` | 按值捕获异常 |

## 建议

- 不要为了"优化"而写丑陋的代码，编译器比你聪明
- 返回大型对象时直接 `return obj`，不要手动 `std::move`
- 非必要不用 `std::move` 阻碍 NRVO
- 关注代码可读性，优化交给编译器
