# struct 与 class

`struct` 和 `class` 都是定义类型的关键字，**唯一的区别是默认访问权限**。

## struct

数据聚合，成员默认 `public`。

```cpp
#include <iostream>
#include <string>

struct Student {
    std::string name;
    int age;
    double score;
};

int main() {
    Student s1;
    s1.name = "Alice";

    Student s2 = {"Bob", 21, 85.0};  // 聚合初始化

    std::cout << s1.name << " " << s2.score;
}
```

struct 同样可以有构造函数、成员函数、继承。区别仅在默认访问权限，struct 和 class 完全可以互相替代，C++ 程序员只是按惯例区分：小型的、数据为主的类型用 struct，涉及复杂封装/行为的用 class。

## class

封装数据和操作，成员默认 `private`。

```cpp
class BankAccount {
private:
    std::string owner;
    double balance;

public:
    BankAccount(std::string n, double b) : owner(n), balance(b) {}

    void deposit(double amount) { balance += amount; }

    bool withdraw(double amount) {
        if (amount > balance) return false;
        balance -= amount;
        return true;
    }

    double getBalance() const { return balance; }
};
```

## 访问权限

| 关键字 | 访问范围 |
|--------|----------|
| `public` | 任何地方 |
| `private` | 仅类内部 |
| `protected` | 类内部 + 子类 |

## const 成员函数

函数末尾加 `const`，声明不修改成员。只有 `const` 函数可被 `const` 对象调用：

```cpp
double getBalance() const { return balance; }
```

### 原理

`const` 成员函数的 `this` 指针类型是 `const T*`，而非 `T*`，因此不能修改成员：

```cpp
// 编译器视为
double getBalance(const BankAccount* this) {
    return this->balance;
}
```

### const 重载

`const` 和非 `const` 版本可以共存，根据对象是否 const 选择：

```cpp
struct Vector {
    int& operator[](size_t i) {
        return data[i];
    }

    const int& operator[](size_t i) const {
        return data[i];
    }
};

Vector v;
v[0] = 1;          // 非 const 版本，可写

const Vector cv;
// cv[0] = 1;      // 错误！const 版本返回 const int&
int x = cv[0];      // const 版本，只读
```

### 设计原则

- 不修改对象的成员函数应标记 `const`
- 允许 const 对象调用
- 是接口契约的一部分："调用此函数不会改变对象状态"

## mutable

`mutable` 允许成员变量在 `const` 函数中被修改，常用于缓存、引用计数、互斥锁。

```cpp
struct Cache {
    int compute(int key) const {
        auto it = cache_.find(key);
        if (it != cache_.end())
            return it->second;
        int val = expensive_compute(key);
        cache_[key] = val;   // 修改 mutable 成员
        return val;
    }

private:
    mutable std::map<int, int> cache_;  // const 函数中也可写
    int expensive_compute(int k) const { /* ... */ }
};
```

注意：`mutable` 应谨慎使用，它打破 const 语义，通常只在缓存、线程安全等场景使用。

## 成员函数类外定义

```cpp
class Student {
public:
    void introduce() const;
};

void Student::introduce() const {
    std::cout << name;
}
```

## 用户定义转换

类可以定义隐式转换到其他类型，通过 `operator type()`。

```cpp
struct Fraction {
    int num, den;

    // 到 double 的隐式转换
    operator double() const {
        return static_cast<double>(num) / den;
    }

    // explicit 转换（C++11），防止意外
    explicit operator bool() const {
        return den != 0;
    }
};

Fraction f{3, 4};
double d = f;  // 隐式调用 operator double()
// if (f)       // OK：if 条件允许 explicit bool
// int x = f;   // 错误：无 int 转换
```

`explicit` 转换运算符只在特定语境触发（`if`、`while`、`!`、逻辑运算符），防止静默的类型转换错误。

## struct vs class

| | struct | class |
|--|--------|-------|
| 默认成员访问 | `public` | `private` |
| 默认继承 | `public` | `private` |
| 惯用场景 | 轻量数据聚合 | 封装 + 行为 |

注意：struct 可以有成员函数、构造函数、继承、模板参数等一切 class 支持的特性。两者在 C++ 中完全等同。
