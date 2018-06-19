var a = {
b :2,
foo : function () {
console.log(this.b);
}
}

 a.foo(); //1
 var c = a.foo;
 c();
 console.log(c()); //2

setTimeout(function(){
 console.log(a.foo(),"===inside setTimeout")  //3
},200);