const infixToFunction = {
    "+": (x, y) => x + y,
    "-": (x, y) => x - y,
    "*": (x, y) => x * y,
    "/": (x, y) => x / y,
  }
  
  //.replace with regex, the callback function's parametter comes from the capture groups of the regex. the _match is just to get/check the matched
  //infix string but is not actually used in the function hence the prefix _
  const infixEval = (str, regex) => str.replace(regex, (_match, arg1, operator, arg2) => infixToFunction[operator](parseFloat(arg1), parseFloat(arg2)));
  //infixEval used in applyFunction
  //const infix = /([\d.]+)([+-])([\d.]+)/;    => regex parameter  
  //const str2 = infixEval(noHigh, infix);

//checks if formula has * and / then evaluates them first
  const highPrecedence = str => {
    const regex = /([\d.]+)([*\/])([\d.]+)/;
    const str2 = infixEval(str, regex);                 //if operations are not * / the infixEval function won't work and the str value is returned directly
    return str === str2 ? str : highPrecedence(str2);
  }
  
  const isEven = num => num % 2 === 0;
  const sum = nums => nums.reduce((acc, el) => acc + el, 0);
  const average = nums => sum(nums) / nums.length;
  
  const median = nums => {
    const sorted = nums.slice().sort((a, b) => a - b);
    const length = sorted.length;
    const middle = length / 2 - 1;
    return isEven(length)
      ? average([sorted[middle], sorted[middle + 1]])
      : sorted[Math.ceil(middle)];
  }
  
  const spreadsheetFunctions = {
    "": arg => arg,
    sum,
    average,
    median,
    even: nums => nums.filter(isEven),
    someeven: nums => nums.some(isEven),
    everyeven: nums => nums.every(isEven),
    firsttwo: nums => nums.slice(0, 2),
    lasttwo: nums => nums.slice(-2),
    has2: nums => nums.includes(2),
    increment: nums => nums.map(num => num + 1),
    random: ([x, y]) => Math.floor(Math.random() * y + x),
    range: nums => range(...nums),
    nodupes: nums => [...new Set(nums).values()]
  }
  
  const applyFunction = str => {
    const noHigh = highPrecedence(str);
    const infix = /([\d.]+)([+-])([\d.]+)/;
    const str2 = infixEval(noHigh, infix);
    const functionCall = /([a-z0-9]*)\(([0-9., ]*)\)(?!.*\()/i;                //1st CG: for function names ex. sum ==> \( open parenthesis ==> 2nd CG: numbers ==> \) closing parenthesis ==> (?!.*\() egative lookahead assertion. It ensures that there are no additional opening parentheses ( after the current function call in the string.
    const toNumberList = args => args.split(",").map(parseFloat);              //to convert input series of numbers into array => to prepare for implementation of the spreadsheetFunction ex. sum(1,2,3,4) => [1,2,3,4]
    const apply = (fn, args) => spreadsheetFunctions[fn.toLowerCase()](toNumberList(args));
    return str2.replace(functionCall, (match, fn, args) => spreadsheetFunctions.hasOwnProperty(fn.toLowerCase()) ? apply(fn, args) : match);
  }
  
  const range = (start, end) => Array(end - start + 1).fill(start).map((element, index) => element + index);
  const charRange = (start, end) => range(start.charCodeAt(0), end.charCodeAt(0)).map(code => String.fromCharCode(code));
  
  //for formulas using the cell name or cell range (ex A1 * SUM(B2:B8))
  const evalFormula = (x, cells) => {              //x = string in the cell | cells = An array of all cell elements, representing all cells in the spreadsheet. This array contains the DOM elements for each cell.
    const idToText = id => cells.find(cell => cell.id === id).value;                //Directly retrieves the value of a cell given its ID. | Converts a cell reference (ex "A1") into the actual value of that cell.
    const rangeRegex = /([A-J])([1-9][0-9]?):([A-J])([1-9][0-9]?)/gi;               //char1, num1, char2, num2
    const rangeFromString = (num1, num2) => range(parseInt(num1), parseInt(num2));  //Converts a numeric range (ex. "1:3") into an array of numbers [1, 2, 3]
    const elemValue = num => character => idToText(character + num);                //Generates a function that retrieves the value of a cell based on a column letter and a row number. It combines these two pieces to form a cell ID and then uses idToText to get the cell’s value.
    const addCharacters = character1 => character2 => num => charRange(character1, character2).map(elemValue(num));   //when arranged in columns | given two column letters and a row number, returns an array of cell values for that row across the columns. | for elemValue the character parameter comes from charRange function
    const rangeExpanded = x.replace(rangeRegex, (_match, char1, num1, char2, num2) => rangeFromString(num1, num2).map(addCharacters(char1)(char2)));    //Replaces any cell ranges in the formula with the corresponding cell values. (ex. values of "A1", "A2", "B1", "B2")
    const cellRegex = /[A-J][1-9][0-9]?/gi;  //for the remaining cell names
    const cellExpanded = rangeExpanded.replace(cellRegex, match => idToText(match.toUpperCase()));  //to get the values of the remaining cell names after getting the range cells (ex. =A1 + SUM(2,3,4) + C1   output: =5 + SUM(2,3,4) + 10)
    const functionExpanded = applyFunction(cellExpanded);       //aplies corresponding mathematical operation
    return functionExpanded === x ? functionExpanded : evalFormula(functionExpanded, cells);
  }
  
  // Sets up the spreadsheet by creating the grid of cells and labels once the entire HTML page has fully loaded.
  window.onload = () => {
    const container = document.getElementById("container");   //parent container for the spreadsheet grid.
    const createLabel = (name) => {     //Creates a label element for either a column (ex. "A") or a row (ex. "1")
      const label = document.createElement("div");
      label.className = "label";
      label.textContent = name;
      container.appendChild(label);
    }
    const letters = charRange("A", "J");  //Creates labels for the columns from "A" to "J" and appends them to the container.
    letters.forEach(createLabel);
    range(1, 99).forEach(number => {    //Creates labels for the rows from 1 to 99 and appends them to the container.
      createLabel(number);    
      letters.forEach(letter => {
        const input = document.createElement("input");    //Creates a new input element
        input.type = "text";
        input.id = letter + number;     //Assigns a unique id to the input, combining the column letter and row number (ex. "A1")
        input.ariaLabel = letter + number;  
        input.onchange = update;        //triggers when the input's value changes
        container.appendChild(input);
      })
    })
  }
  
  //triggered whenever a user changes the value in a cell
  //processes the input, checks if it's a formula (starts with "="), and evaluates it if necessary.
  const update = event => {
    const element = event.target;       //Gets the input element that triggered the event
    const value = element.value.replace(/\s/g, "");     //Removes all whitespace from the input value
    if (!value.includes(element.id) && value.startsWith('=')) {     //Ensures the formula does not reference the current cell itself (to prevent circular references) && starts with "="
      element.value = evalFormula(value.slice(1), Array.from(document.getElementById("container").children));   //Evaluates the formula and updates the cell with the result
    }
  }

  /*
  value.slice(1): Removes the leading "=" from the formula string
  Array.from(document.getElementById("container").children): Converts the container element's children (all cells) into an array
  evalFormula(...): Calls evalFormula with the formula and the array of cells, returning the evaluated result.
  element.value = ...: Updates the input element's value with the evaluated result.
  */