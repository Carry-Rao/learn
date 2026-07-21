# 多态

多态允许通过基类指针或引用调用派生类的重写方法。

## 虚函数

```cpp
#include <iostream>

class Animal {
public:
    virtual void speak() {
        std::cout << "Animal speaks" << std::endl;
    }
};

class Dog : public Animal {
public:
    void speak() override {
        std::cout << "Woof!" << std::endl;
    }
};

int main() {
    Animal* a = new Dog();
    a->speak();  // Woof!
}
```

## override

`override` 显式标记要重写基类的虚函数，编译器检查签名是否匹配：

```cpp
class Derived : public Base {
    void foo() override;       // 编译通过
    void bar() const override; // 编译错误：签名不匹配
};
```

## final

阻止进一步重写或继承：

```cpp
class Base {
    virtual void func() final;
};
class Derived final : public Base {};
// class Grand : public Derived {};  // 错误
```

## 虚析构函数

基类析构必须为 `virtual`，否则删除派生类对象时只调基类析构：

```cpp
class Base {
public:
    virtual ~Base() = default;
};
```

## 纯虚函数与抽象类

```cpp
class Shape {
public:
    virtual double area() const = 0;  // 纯虚函数
    virtual ~Shape() = default;
};
// Shape s;  // 错误：不能实例化抽象类
```

## 原理：虚表（vtable）

多态通过虚表实现。每个包含虚函数的类有一个静态虚表，对象内有一个虚指针（vptr）指向它。

```
Animal 对象内存布局：
+----------+
| vptr ----+----> Animal vtable:
+----------+     +---------------+
| 其他成员 |     | &Animal::speak |
+----------+     +---------------+

Dog 对象内存布局：
+----------+
| vptr ----+----> Dog vtable:
+----------+     +---------------+
| 其他成员 |     | &Dog::speak   |
+----------+     +---------------+
```

```cpp
Animal* a = new Dog();
a->speak();
// 编译后大致等价于：
// (*a->vptr[0])(a);  // 从虚表取函数指针，间接调用
```

**调用过程**：
1. 通过对象的 vptr 找到类的 vtable
2. 从 vtable 中取出对应的函数指针
3. 间接调用

**开销**：
- 每个对象增加一个指针（vptr）的大小
- 调用无法内联（间接调用）
- 每个虚函数在 vtable 中占一个槽位

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

## 用户定义转换

类可以定义隐式转换到其他类型，通过 `operator type()`。

```cpp
struct Fraction {
    int num, den;

    operator double() const {
        return static_cast<double>(num) / den;
    }

    explicit operator bool() const {
        return den != 0;
    }
};

Fraction f{3, 4};
double d = f;
// if (f)
// int x = f;   // 错误
```

`explicit` 转换运算符只在特定语境触发（`if`、`while`、`!`、逻辑运算符）。
