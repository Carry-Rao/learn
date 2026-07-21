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
