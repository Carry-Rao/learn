# 多态

多态允许通过基类指针或引用调用派生类的重写方法，C++ 通过虚表实现运行时多态。

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
    void speak() override {    // override 显式标记重写，编译器检查
        std::cout << "Woof!" << std::endl;
    }
};

class Cat : public Animal {
public:
    void speak() override {
        std::cout << "Meow!" << std::endl;
    }
};

int main() {
    Animal* animals[] = {new Dog(), new Cat()};
    for (auto a : animals)
        a->speak();  // 调用实际类型的版本
}
```

输出：

```
Woof!
Meow!
```

## override

C++11 引入 `override` 关键字，显式标记要重写基类的虚函数。编译器会检查基类是否存在对应虚函数，避免拼写错误或签名不匹配：

```cpp
class Derived : public Base {
    void foo() override;      // 编译通过：Base 有 virtual foo
    void bar() const override; // 编译错误：Base 的 bar 不是 const
};
```

## final

`final` 阻止进一步重写或继承。

```cpp
class Base {
public:
    virtual void func() final;  // 禁止子类重写
};

class Derived final : public Base {
    // void func() override;    // 错误！func 是 final
};

// class GrandDerived : public Derived { };  // 错误！Derived 是 final
```

## 虚析构函数

基类析构函数必须声明为 `virtual`，否则通过基类指针删除派生类对象时只调用基类析构，导致资源泄漏：

```cpp
class Base {
public:
    virtual ~Base() = default;  // 虚析构
};

class Derived : public Base {
    int* data = new int[100];
public:
    ~Derived() override { delete[] data; }
};

Base* p = new Derived();
delete p;  // 正确调用 ~Derived()
```

## 纯虚函数与抽象类

纯虚函数没有实现，包含纯虚函数的类称为抽象类，不能实例化。

```cpp
class Shape {                    // 抽象类
public:
    virtual double area() const = 0;  // 纯虚函数
    virtual ~Shape() = default;
};

class Circle : public Shape {
    double r;
public:
    Circle(double r) : r(r) {}
    double area() const override {
        return 3.14159 * r * r;
    }
};

// Shape s;              // 错误！不能实例化抽象类
Circle c(5.0);           // OK
Shape& ref = c;          // OK：基类引用指向派生类
```

## 虚表与性能

每个包含虚函数的类有一个虚表（vtable），对象通过虚指针（vptr）查找实际调用的函数。多态调用有轻微性能开销，无法内联。
