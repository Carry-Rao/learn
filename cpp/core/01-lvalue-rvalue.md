# 值类别：左值与右值

C++ 的每个表达式都属于一种值类别，这是理解移动语义和完美转发的前提。

## 分类

C++11 起值类别分为三种核心类型：

```
        expression
        /        \
    glvalue     rvalue
    /     \     /    \
lvalue   xvalue  prvalue
```

- **lvalue**（左值）— 有身份，可取地址
- **prvalue**（纯右值）— 无身份，临时值
- **xvalue**（将亡值）— 有身份但资源即将被转移

## lvalue

有名称、可取地址的表达式。出现在赋值号左边。

```cpp
int x = 10;
x;               // lvalue：变量名
++x;             // lvalue：前置自增返回左值引用
std::cout;       // lvalue：流对象
"hello";         // lvalue：字符串字面量
int arr[3];
arr[0];          // lvalue：数组元素
```

## prvalue

纯右值，临时对象或字面量（字符串字面量除外）。

```cpp
42;              // prvalue：整数字面量
x + 5;           // prvalue：算术表达式结果
x++;             // prvalue：后置自增返回原值的副本
true;            // prvalue：布尔字面量
nullptr;         // prvalue
&x;              // prvalue：取地址结果
[](int a){ return a; };  // prvalue：lambda
```

## xvalue

将亡值，资源即将被转移的对象。通过 `std::move` 或右值引用转换得到。

```cpp
int x = 10;
std::move(x);    // xvalue
static_cast<int&&>(x);  // xvalue
```

## 判断方法

| 特征 | lvalue | prvalue | xvalue |
|------|--------|---------|--------|
| 有身份（可&） | 是 | 否 | 是 |
| 可移动 | 否 | 是 | 是 |
| 示例 | `x` `*p` `s[0]` | `42` `a+b` `&x` | `move(x)` |

检查左值：

```cpp
int x = 0;
&x;               // OK：左值可取地址
// &42;           // 错误：右值不可取地址
// &(x + 1);      // 错误：prvalue 不可取地址
```

## 右值引用绑定规则

```cpp
int&  lr = x;     // OK：左值引用绑定到左值
int&  lr2 = 42;   // 错误：左值引用不能绑定到右值
const int& cr = 42;  // OK：const 左值引用可绑定到右值（延长生命周期）
int&& rr = 42;    // OK：右值引用绑定到右值
int&& rr2 = x;    // 错误：右值引用不能绑定到左值
int&& rr3 = std::move(x);  // OK：xvalue
```

理解值类别才能理解 `std::move` 为什么只做 `static_cast`、`std::forward` 如何保持引用属性。
