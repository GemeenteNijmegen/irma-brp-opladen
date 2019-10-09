package nl.nijmegen.mule.agelimits;

import java.time.LocalDate;
import org.mule.api.MuleMessage;
import org.mule.api.transformer.TransformerException;
import org.mule.api.transport.PropertyScope;
import org.mule.transformer.AbstractMessageTransformer;
import org.apache.commons.logging.Log;
import org.apache.commons.logging.LogFactory;

public class calculateAgeLimits  extends AbstractMessageTransformer{
	private static Log logger = LogFactory.getLog("nl.Nijmegen.brp.irma-api.calculateagelimits");
		      
		      
		      @Override
			public Object transformMessage(MuleMessage message, String outputEncoding) throws TransformerException {
		    	 
		    	//Zet geboortedatum
			  		//String bDay = "20000000";
			    	//String bDay =  message.getInvocationProperty("sv_geboortedatum");
			    	String bDay = message.getProperty("sv_geboortedatum", PropertyScope.INVOCATION);
			  		//Code uit elkaar halen op jaar, maand en dag		  		
			    	int lengteBDay = bDay.length();
					if (lengteBDay !=8) {
						throw new ArithmeticException("Geen valide geboortedatum ingevoerd.");
						
					}		
					//Code uit elkaar halen op jaar, maand en dag
					String bYear = (bDay.substring(0,4));
					String bMonth1=	bDay.substring(bDay.length() - 4);
					String bMonth2 = (bMonth1.substring(0,2));
					String bDag = bDay.substring(bDay.length() - 2);
					
					
					//omzetten naar een int.
					int bYearInt = Integer.parseInt(bYear);
					int bMonthInt = Integer.parseInt(bMonth2);
					int bDagInt = Integer.parseInt(bDag);
					logger.debug("jaar: " + bYearInt);
					logger.debug("maand: " + bMonthInt);
					logger.debug("dag: " + bDagInt);
					
					if (bYearInt ==0 || bYearInt <1850) {
						throw new ArithmeticException("Geen valide geboortedatum ingevoerd.");
					}
					if (bMonthInt >12) {
						throw new ArithmeticException("Geen valide geboortedatum ingevoerd.");		
					}
					if (bDagInt >31) {
						throw new ArithmeticException("Geen valide geboortedatum ingevoerd.");		
					}
					
					//als maand null is dan 1 juli invullen
					if (bMonthInt == 0) {
						bMonthInt = 1;
						bMonthInt = 7;}
					//als dag null is, dan waarde op 1 zetten en vervolgens naar laatste dag van de maand
					if (bDagInt == 00) {

						LocalDate noDay = LocalDate.of(bYearInt,bMonthInt,1);
					    LocalDate end = noDay.withDayOfMonth(noDay.lengthOfMonth());
					    int dayOfMonth = end.getDayOfMonth();
					    bDagInt = dayOfMonth;
					      }
					if (bMonthInt == 2 & bDagInt == 29) {
						bDagInt=28;
					}

					String resultString = "";
					
					//geboortedag bepalen
					      LocalDate currentTime = LocalDate.now();
					      LocalDate birthday = LocalDate.of(bYearInt,bMonthInt,bDagInt);
					      logger.debug("Huidige datum: " + currentTime);
					      logger.debug("Geboortedatum: " + birthday);
					      
					      
					 //array maken met alle jaren erin      
					      int[] jaar = new int[] {12,16,18,21,65};
					      for (int i=0; i<jaar.length; i++)
					      {
					    	//door array lopen
					    	//in de array current date bepalen
					    	//jaren van currentdate afhalen
					    	LocalDate date1 = LocalDate.now().minusYears(jaar[i]);
					    	       
					    	String resultValue;
					    	String resultLabel;
					    	//vergelijken geboortedatum en currentdate
					        if(date1.isBefore(birthday)) {
					        	resultValue = "No";
					        }
					        else {
					    		resultValue = "Yes";
					    		
					        }
					        //string met "isOver+jaar":'ja/nee'" vullen en concateren over loop heen
					        resultLabel = "\"" +"over" + jaar[i];		                        
					        resultString = resultString + resultLabel + "\"" +":"+ "\"" + resultValue + "\"" + ",";
					      }
					      	//resultString teruggeven
					      resultString = "{" + resultString.substring(0, resultString.length()-1) +"}";
					      resultString = "{"+ "\""+"ageLimits"+"\""+": " + resultString +"}";
					      logger.debug("resultString: " + resultString);
					return resultString;
				
			}

	};
	


