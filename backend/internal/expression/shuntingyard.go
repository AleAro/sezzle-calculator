package expression

// precedence returns the binding power of an operator; a higher value binds
// tighter.
func precedence(k tokenKind) int {
	switch k {
	case tkPlus, tkMinus:
		return 2
	case tkStar, tkSlash:
		return 3
	case tkNeg:
		return 4
	case tkCaret:
		return 5
	case tkSqrt:
		return 6
	case tkPercent:
		return 7
	default:
		return 0
	}
}

// isLeftAssociative reports whether a binary operator is left-associative.
// Only '^' is right-associative among the binary operators.
func isLeftAssociative(k tokenKind) bool {
	switch k {
	case tkPlus, tkMinus, tkStar, tkSlash:
		return true
	default:
		return false
	}
}

// toRPN converts an infix token slice into Reverse Polish Notation using the
// shunting-yard algorithm.
func toRPN(tokens []token) ([]token, error) {
	var output []token
	var ops []token
	for _, tok := range tokens {
		switch tok.kind {
		case tkNumber, tkPercent:
			// A number, and the postfix '%' that applies to the operand just
			// emitted, go straight to the output queue.
			output = append(output, tok)
		case tkSqrt, tkNeg:
			// Prefix unary operators wait on the stack for their operand.
			ops = append(ops, tok)
		case tkPlus, tkMinus, tkStar, tkSlash, tkCaret:
			for len(ops) > 0 {
				top := ops[len(ops)-1]
				if top.kind == tkLParen {
					break
				}
				if precedence(top.kind) > precedence(tok.kind) ||
					(precedence(top.kind) == precedence(tok.kind) && isLeftAssociative(tok.kind)) {
					output = append(output, top)
					ops = ops[:len(ops)-1]
					continue
				}
				break
			}
			ops = append(ops, tok)
		case tkLParen:
			ops = append(ops, tok)
		case tkRParen:
			matched := false
			for len(ops) > 0 {
				top := ops[len(ops)-1]
				ops = ops[:len(ops)-1]
				if top.kind == tkLParen {
					matched = true
					break
				}
				output = append(output, top)
			}
			if !matched {
				return nil, ErrUnbalancedParentheses
			}
		}
	}
	for len(ops) > 0 {
		top := ops[len(ops)-1]
		ops = ops[:len(ops)-1]
		if top.kind == tkLParen {
			return nil, ErrUnbalancedParentheses
		}
		output = append(output, top)
	}
	return output, nil
}
