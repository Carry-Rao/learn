# 四种类型转换

C++ 提供四种显式类型转换运算符，比 C 风格转换更精确、更安全。

## static_cast

编译期类型转换，用于相邻类型间的安全转换。

```cpp
// 数值转换
double d = 3.14;
int i = static_cast<int>(d);  // 3

// 枚举 ↔ 整数
enum class Color { RED, GREEN, BLUE };
int c = static_cast<int>(Color::GREEN);  // 1

// 基类 ↔ 派生类（上行安全，下行不检查）
struct Base {};
struct Derived : Base {};

Derived d;
Base& b = static_cast<Base&>(d);           // 上行：安全
Derived& d2 = static_cast<Derived&>(b);    // 下行：不检查，需程序员保证
```

`static_cast` 在编译期进行，零运行时开销（下行转换不执行类型检查）。

原理：编译器已知类型关系，直接调整指针/偏移或生成数值转换指令。

## dynamic_cast

运行时类型转换，用于多态类型（必须有虚函数）的向下转换，**需要 RTTI**。

```cpp
struct Base { virtual ~Base() = default; };
struct Derived : Base { void extra() {} };

Base* b = new Derived;

// 下行转换：成功
Derived* d = dynamic_cast<Derived*>(b);
if (d) d->extra();

Base* base2 = new Base;
Derived* d2 = dynamic_cast<Derived*>(base2);
// d2 == nullptr（转换失败）
```

原理：每个多态对象有一个虚函数表指针（vptr），编译器在虚函数表中附加 RTTI 信息。`dynamic_cast` 运行时遍历继承链，检查目标类型是否匹配。失败时返回 `nullptr`（指针）或抛 `std::bad_cast`（引用）。

```cpp
// 大致等价实现（伪代码）
template <typename T>
T* dynamic_cast_impl(void* ptr, const type_info& target) {
    if (ptr == nullptr) return nullptr;
    // 遍历 vptr 指向的 RTTI 继承链
    // 如果 ptr 的实际类型是 target 或 target 的派生类，返回转换后的指针
    // 否则返回 nullptr
}
```

注意：`dynamic_cast` 有运行时开销（类型查找），启用 RTTI 时可用 `-fno-rtti` 禁用。

## const_cast

添加或移除 `const`/`volatile` 限定符。

```cpp
const int x = 42;
int& r = const_cast<int&>(x);

// 通过 const_cast 修改变量是未定义行为（除非原对象非 const）
void print(int* p) { std::cout << *p; }

const int data = 100;
// print(&data);          // 错误：const int* → int*
print(const_cast<int*>(&data));  // 强制去除 const
```

唯一合法用途：接口不一致时，调用一个非 const 但实际不修改的函数。

```cpp
void old_api(char* buf);  // 实际不修改 buf

std::string s = "hello";
old_api(const_cast<char*>(s.c_str()));  // 安全：c_str() 只读，old_api 也不改
```

原理：`const_cast` 不生成任何机器码，只是告诉编译器"忽略这里的 const 限定"，纯粹编译期行为。

## reinterpret_cast

在任意指针/引用类型之间按位重新解释，或将指针转为整数。

```cpp
int x = 0x12345678;

// 指针类型互转
float* fp = reinterpret_cast<float*>(&x);  // 把 int 地址当 float 读

// 指针 ↔ 整数
uintptr_t addr = reinterpret_cast<uintptr_t>(&x);  // 指针转整数

// 函数指针转换（极少用）
void (*fp)() = reinterpret_cast<void(*)()>(0x1234);
```

警告：`reinterpret_cast` 是 C++ 中最危险的转换，完全不检查类型安全。通常只在底层系统编程或序列化场景使用。

原理：纯编译期行为，直接生成位复制指令或直接传递地址值（零开销）。

## C 风格转换

```cpp
int x = (int)3.14;       // C 风格
int y = int(3.14);       // 函数风格（等价）
```

C 风格转换实际上尝试以下顺序（第一个成功的）：
1. `const_cast`
2. `static_cast`
3. `static_cast` + `const_cast`
4. `reinterpret_cast`
5. `reinterpret_cast` + `const_cast`

相比显式转换，C 风格转换可能意外做 reinterpret_cast，不建议使用。

## 对比

| 转换 | 时机 | 安全 | 开销 | 用途 |
|------|------|------|------|------|
| `static_cast` | 编译期 | 中 | 零 | 数值、相关类型转换 |
| `dynamic_cast` | 运行时 | 高 | RTTI 查找 | 多态下行转换 |
| `const_cast` | 编译期 | 低 | 零 | 去 const |
| `reinterpret_cast`| 编译期 | 无 | 零 | 底层位重新解释 |

## 建议

- 优先 `static_cast`，明确表达意图
- 多态下行用 `dynamic_cast`
- 尽可能避免 `const_cast` 和 `reinterpret_cast`
- 永远不用 C 风格转换
