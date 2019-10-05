package ast;

/**
 * @author GAO RISHENG A0101891L
 * This class is mainly in charge of syntax generation of if statement in C Programs
 */
public final class ASTIfStatementC extends ASTIfStatement {

	public ASTIfStatementC() {

	}

	public ASTIfStatementC(ASTExpression e) {
		super(e);
	}
	public String toSyntax(){
		String result = "";
		result += ("if("+this.condition.toSyntax()+") {\n");
		for(int i = 0;i<this.ifBranch.size();i++){
			result+= ("\t"+this.ifBranch.get(i).toSyntax());
		}
		result += "\t}\n";
		if(!this.elseBranch.isEmpty()){
			result += "else {\n";
			for(int j = 0; j<this.elseBranch.size();j++){
				result+=("\t"+this.elseBranch.get(j).toSyntax());
			}
			result +="}\n";
		}
		this.result = result;
		return this.result;
	}
}
