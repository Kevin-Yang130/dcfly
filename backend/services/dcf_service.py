from typing import List, Dict, Any


def calculate_dcf(
    current_fcf: float,
    growth_rate: float,       # as decimal, e.g. 0.10
    discount_rate: float,     # as decimal, e.g. 0.10
    terminal_growth_rate: float,
    projection_years: int,
    shares_outstanding: float,
) -> Dict[str, Any]:
    years_data: List[Dict[str, Any]] = []
    total_pv = 0.0

    for year in range(1, projection_years + 1):
        projected_fcf = current_fcf * ((1 + growth_rate) ** year)
        pv = projected_fcf / ((1 + discount_rate) ** year)
        total_pv += pv
        years_data.append({
            "year": f"Y{year}",
            "projectedFCF": projected_fcf,
            "presentValue": pv,
        })

    final_fcf = current_fcf * ((1 + growth_rate) ** projection_years)

    if discount_rate <= terminal_growth_rate:
        terminal_value = 0.0
    else:
        terminal_value = (final_fcf * (1 + terminal_growth_rate)) / (discount_rate - terminal_growth_rate)

    terminal_pv = terminal_value / ((1 + discount_rate) ** projection_years)
    enterprise_value = total_pv + terminal_pv
    intrinsic_per_share = enterprise_value / shares_outstanding if shares_outstanding > 0 else 0.0

    return {
        "enterpriseValue": enterprise_value,
        "intrinsicValuePerShare": intrinsic_per_share,
        "terminalValue": terminal_value,
        "terminalValuePV": terminal_pv,
        "yearsData": years_data,
    }
