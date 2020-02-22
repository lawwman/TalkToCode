var variable_types = ["int", "long", "float", "double", "boolean", "char", "string", "void"];

// var parsy = require("./parse_statements.ts");
import { parse_statement, convert2Camel, parse_fragment, checkValidity } from './parse_statements'
import { structCommand } from './struct_command'


/* Main function of segmenter.ts is to perform checks on the commands and segment out long var names.
Should look into seperating functionality of block statements and simple statements.

@params:
text - command spoken by the user.
var_list - list of variables already declared. 

@ Returns the struct command in the format [list of struct commands, variable list, conditions list]
list of struct commands 
    each element is a line of struct command. 
    For e.g. [#create int #variable first #value 1 #dec_end;;]
    If the struct command contains multiple lines, i.e. is a block statement, then
    the list of struct commands will contain:
    ['if #condition #variable helloWorld > #value 5  #if_branch_start', '#if_branch_end;;' ]

variable list
    list of new variables declared by the user. This is only updated when a declare command is given. */

export function parse_command(text: string, var_list: string[], func_list: string[]) {
    var starting_command = determine_user_command(text, var_list);

    if (starting_command[0] == "not ready") {
        var command = new structCommand("non-block");
        command.logError(starting_command[1]);
        return command;
    }

    /* Splitted_text is the user's command without the leading starting command.
    Starting command refers to "begin if", "begin loop" etc. */
    var splitted_text = starting_command[1].split(" ");

    switch(starting_command[0]) {
        case "if":
            return parse_if(splitted_text, var_list, func_list);
        case "else":
            return parse_else(splitted_text);
        case "loop":
            return parse_for_loop(splitted_text, var_list, func_list);
        case "function":
            return parse_function(splitted_text);
        case "while":
            return parse_while(splitted_text, var_list, func_list);
        case "switch":
            return parse_switch(splitted_text, var_list, func_list);
        case "do":
            return parse_do(splitted_text, var_list, func_list);
        case "case":
            return parse_case(splitted_text);
        default:
            var statement = parse_statement(text, var_list, func_list);
            return statement.convert2StructCommand();
    }
}

/* To determine what command the user is trying say */
function determine_user_command(text: string, var_list: string[]) {

    text = text.replace("begin if", "if");
    text = text.replace("begin Loop", "loop");
    text = text.replace("begin switch", "switch");
    text = text.replace("create function", "function");
    text = text.replace("do while", "do");

    var splitted_text = text.split(" ");

    var starting_command = splitted_text[0];

    /* Remove starting command from the text. */
    return [starting_command, splitted_text.splice(1).join(" ")];
}

/* splitted_text e.g: ['hello', '<', '5'] */
function parse_if(splitted_text: string[], var_list: string[], func_list: string[]) {
    var command = new structCommand("block");
    command.parsedCommand = "if #condition";

    var statement = parse_statement(splitted_text.join(" "), var_list, func_list);
    if (statement.hasError) {
        command.logError("incomplete condition, " + statement.errorMessage);
        return command;
    }
    if (!statement.isInfix) {
        command.logError("infix is required.");
        return command;
    }
    command.parsedCommand += " " + statement.parsedStatement + " #if_branch_start";
    command.endCommand = "#if_branch_end;;";
    return command;
}

function parse_else(splitted_text: string[]) {
    var command = new structCommand("block");
    command.isElse = true;
    command.parsedCommand = "#else_branch_start";
    command.endCommand = "#else_branch_end;;";
    return command;
}

/* [ 'while', 'first hello', '==', 'second' ] 
I used the exact same code as If block. Will be much more different when If block allows for Else if. */
function parse_while(splitted_text: string[], var_list: string[], func_list: string[]) {
    var command = new structCommand("block");
    command.parsedCommand = "while #condition"
    var statement = parse_statement(splitted_text.join(" "), var_list, func_list);
    if (statement.hasError) {
        command.logError("error in parsing statement, " + statement.errorMessage);
        return command;
    }
    if (!statement.isInfix) {
        command.logError("infix is required.");
        return command;
    }
    command.parsedCommand += " " + statement.parsedStatement + " #while_start";
    command.endCommand = "#while_end;;";
    return command;
}

function parse_do(splitted_text: string[], var_list: string[], func_list: string[]) {
    var command = new structCommand("block");
    command.parsedCommand = "do #condition"
    var statement = parse_statement(splitted_text.join(" "), var_list, func_list);
    if (statement.hasError) {
        command.logError("error in parsing statement, " + statement.errorMessage);
        return command;
    }
    if (!statement.isInfix) {
        command.logError("infix is required.");
        return command;
    }
    command.parsedCommand += " " + statement.parsedStatement + " #while_start";
    command.endCommand = "#while_end;;";
    return command;
}

/* splitted_text e.g: [ 'condition','i','==','0','condition','i','<','number','condition','i','++' ] */
function parse_for_loop(splitted_text: string[], var_list: string[], func_list: string[]) {
    var command = new structCommand("block");
    command.parsedCommand = "for";
    /* For loop must have 'condition' key word. */
    if (!splitted_text.includes("condition")) {
        command.logError("Condition was not mentioned.");
        return command;
    }
    /* Split the splitted text array into condition blocks. Omit the first "condition" (using .slice(1))
     for the .split("condition") to work. Lastly, trim each string of the condition block (using .map()).
    E.g. of condition_blocks = [ 'i = 0', 'i < 5', 'i ++' ] */
    var condition_blocks = splitted_text.slice(1).join(" ").split("condition").map(x=>x.trim());
    /* Condition_blocks should have 3 sets. */
    if (condition_blocks.length != 3) {
        command.logError("need to have 3 conditions.");
        return command;
    }
    for (var i = 0; i < condition_blocks.length; i++) {
        
        /* Do not confuse first condition block for an infix condition. it is an assign statement. */
        if ( i == 0) condition_blocks[0] = condition_blocks[0].replace("==", "equal");
        var statement = parse_statement(condition_blocks[i], var_list, func_list);
        if (statement.hasError) {
            command.logError("something wrong with for-loop infix condition. " + statement.errorMessage);
            return command;
        }
        if (!statement.isInfix && i == 1) {
            command.logError("infix is required.");
            return command;
        }
        statement.removeTerminator();
        command.parsedCommand += " #condition " + statement.parsedStatement;
    }
    command.parsedCommand += " #for_start"
    command.endCommand = "#for_end;;";
    return command;
}
/* splitted_text e.g: ['main', 'with', 'return', 'type', 'int', 'begin'] or 
['main', 'with', 'return', 'type', 'int', 'with', 'parameter', 'int', 'length', 
'with', 'parameter', 'int', 'array', 'numbers', 'begin'] */
function parse_function(splitted_text: string[]) {
    var command = new structCommand("block");
    command.parsedCommand = "#function_declare";
    if (!splitted_text.includes("with")) {
        command.logError("with was not mentioned.");
        return command;
    }
    if (splitted_text[splitted_text.length-1] != "begin") {
        command.logError("begin is not the last word.");
        return command;
    } 
    /* Remove "begin". Not necessary. */
    var text = splitted_text.join(" ").replace("begin", "");

    var with_blocks = text.split("with");
    with_blocks = with_blocks.map(x=>x.trim());
    
    if (with_blocks[0].length == 0) {
        command.logError("function name was not mentioned.");
        return command;
    }
    if (with_blocks[1].substring(0, 11) != "return type") {
        command.logError("return type was not mentioned.");
        return command;
    }
    if (!with_blocks[1].split(" ").some(x=>variable_types.includes(x))) {
        command.logError("variable type was not mentioned.");
        return command;
    }

    command.parsedCommand += " " + convert2Camel(with_blocks[0].split(" ")); /* Add function name. */    
    command.parsedCommand += " " +  with_blocks[1].slice(12); /* Add var type. */

    if (with_blocks.length == 2) {
        command.endCommand = "#function_end;;";
        command.parsedCommand += " #function_start";
        return command;
    }
    
    var i = 2;
    for (i; i < with_blocks.length; i++) {

        var splitted_param = with_blocks[i].split(" ");

        if (splitted_param.length < 3) {
            command.logError("parameter not complete.");
            return command;
        }
        if (splitted_param[0] != "parameter") {
            command.logError("parameter not mentioned.");
            return command;
        }
        if (!variable_types.includes(splitted_param[1])) {
            command.logError("variable type was not mentioned.");
            return command;
        }

        if (splitted_param[2] == "array") { // If parameter of function is an array.
            if (splitted_param.length < 4) {
                command.logError("parameter not complete");
                return command;
            }
            command.parsedCommand += " #parameter_a #dimension 1 " + splitted_param[1];
            command.parsedCommand += " #array " + splitted_param.slice(3);
        }
        else { // If parameter of function is not an array.
            command.parsedCommand += " #parameter #type " + splitted_param[1]; // Add variable type
            command.parsedCommand += " " + splitted_param.slice(2);
        }
    }
    command.parsedCommand += " #function_start";
    command.endCommand += "#function_end;;";
    return command;
}

function parse_switch(splitted_text: string[], var_list: string[], func_list: string[]) {
    /* switch is a weird case where it is a block in actual code, but in struct command it is not a block. */
    var command = new structCommand("non-block");

    if (splitted_text.length == 0) {
        command.logError("no term mentioned");
        return command;
    }
    var fragment = parse_fragment(splitted_text);
    if (fragment[0] == "not ready") {
        command.logError(fragment[1]);
        return command;
    }
    var validity = checkValidity(fragment[1], var_list, func_list);
    if (!validity) {
        command.logError("variable or function not yet declared.");
        return command;
    }
    command.parsedCommand = "switch #condition " + fragment[1] + ";;";
    return command;
}

function parse_case(splitted_text: string[]) {
    var command = new structCommand("block");
    command.isCase = true;
    if (splitted_text.length == 0) {
        command.logError("no term mentioned");
        return command;
    }
    var fragment = parse_fragment(splitted_text);
    if (fragment[0] == "not ready") {
        command.logError(fragment[1]);
        return command;
    }
    command.parsedCommand = "case " + fragment[1] + " #case_start";
    command.endCommand = "#case_end;;"

    return command;

}

/* Assuming a literal is mentioned first, followed by a statement, segment the 2. */
function splitLiteralAndStatement(text: string) {
    var splitted_text = text.split(" ");

    if (splitted_text.length == 0) return ["not ready", "no literal"];
    if (splitted_text.length == 1) return ["not ready", "no statement"];

    if (!isNaN(splitted_text[0])) return [splitted_text[0], splitted_text.slice(1).join(" ")];
    else return ["not ready", "no matches"];
    // if (splitted_text[0] == "string") not implemented yet!

}