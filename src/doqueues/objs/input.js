function NumberBox(x,y,w,h,val,delta,callback)
{
  var self = this;
  self.x = x;
  self.y = y;
  self.w = w;
  self.h = h;

  self.number = val;

  self.value = ""+val;
  self.focused = false;
  self.highlit = false;
  self.down = false;

  self.ref_x = 0;
  self.delta = delta;

  var validateNum = function(n)
  {
    if(!isNaN(parseFloat(n)) && isFinite(n)) return parseFloat(n);
    else return self.number;
  }

  self.key = function(evt)
  {
  }
  self.key_letter = function(k)
  {
    if(self.focused)
    {
      if(self.value == "0") self.value = "";
      if(self.highlit) self.value = ""+k;
      else             self.value = self.value+k;
      self.number = validateNum(self.value);
      self.highlit = false;
      callback(self.number);
    }
  }
  self.key_down = function(evt)
  {
    if(evt.keyCode == 13) //enter
    {
      if(self.focused)
        self.blur();
    }
    if(evt.keyCode == 8) //delete
    {
      if(self.highlit)
      {
        self.number = 0;
        self.value = "0";
        self.highlit = false;
        callback(self.number);
      }
      else if(self.focused)
      {
        self.value = self.value.substring(0,self.value.length-1);
        self.number = validateNum(self.value);
        callback(self.number);
      }
    }
  }
  self.key_up = function(evt)
  {
  }

  //nice in smooth dragging
  self.offX = 0;
  self.offY = 0;
  self.dragStart = function(evt)
  {
    self.focused = true;
    self.down = true;

    self.offX = evt.doX-self.x;
    self.offY = evt.doY-self.y;
  }
  self.drag = function(evt)
  {
    self.deltaX = ((evt.doX-self.x)-self.offX);
    self.deltaY = ((evt.doY-self.y)-self.offY);
    self.offX = evt.doX - self.x;
    self.offY = evt.doY - self.y;
    self.number = validateNum(self.number + self.deltaX*self.delta);
    self.value = ""+self.number;

    self.down = ptWithinObj(evt.doX, evt.doY, self);
    callback(self.number);
  }
  self.dragFinish = function()
  {
    if(self.down) self.highlit = !self.highlit;
    self.down = false;
  }

  self.blur = function()
  {
    self.focused = false;
    self.highlit = false;
    self.value = ""+self.number;
    callback(self.number);
  }
  self.focus = function()
  {
    self.focused = true;
    self.highlit = true;
  }
  self.set = function(n)
  {
    self.number = validateNum(n);
    callback(self.number);
  }

  self.draw = function(canv)
  {
    if(self.highlit)
    {
      canv.context.fillStyle = "#8899FF";
      canv.context.fillRect(self.x,self.y,self.w,self.h);
    }
         if(self.down)    canv.context.strokeStyle = "#00F400";
    else if(self.focused) canv.context.strokeStyle = "#F40000";
    else                  canv.context.strokeStyle = "#0000F4";
    canv.context.strokeRect(self.x,self.y,self.w,self.h);
    canv.context.fillStyle = "#000000";
    if(self.value.length < 5)
      canv.context.fillText(self.value,self.x+4,self.y+self.h*3/4,self.w-4);
    else
      canv.context.fillText(self.value.substring(0,5)+"...",self.x+4,self.y+self.h*3/4,self.w-4);
  }

  self.print = function()
  {
    console.log("("+self.x+","+self.y+","+self.w+","+self.h+") n:"+self.number+" v:"+self.value+" f:"+self.focused+" h:"+self.highlit+" d:"+self.down+" "+"");
  }
}

function ToggleBox(x,y,w,h,val,callback)
{
  var self = this;
  self.x = x;
  self.y = y;
  self.w = w;
  self.h = h;

  self.on = val;
  self.down = false;

  self.press = function(evt)
  {
    self.down = true;
  }
  self.unpress = function(evt)
  {
    self.down = false;
    if(ptWithinObj(evt.doX, evt.doY, self)) self.toggle();
  }

  self.toggle = function()
  {
    self.on = !self.on;
    callback(self.on);
  }
  self.set = function(n)
  {
    self.on = n;
    callback(self.on);
  }

  self.draw = function(canv)
  {
    if(self.down) canv.context.strokeStyle = "#00F400";
    else          canv.context.strokeStyle = "#000000";

    if(self.on) canv.context.fillStyle = "#00F400";
    else        canv.context.fillStyle = "#FFFFFF";

    canv.context.fillRect(self.x,self.y,self.w,self.h);
    canv.context.strokeRect(self.x,self.y,self.w,self.h);
  }

  self.print = function()
  {
    console.log("("+self.x+","+self.y+","+self.w+","+self.h+") o:"+self.on+" d:"+self.down+" "+"");
  }
}

