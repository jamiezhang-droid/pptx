' VBA Macro to update "Airbnb Weekly Nights Booked" chart
' Add this to your Excel workbook via: Developer > Visual Basic > Insert > Module

Sub UpdateWeeklyChart()
    Dim ws As Worksheet
    Dim cht As ChartObject
    Dim ser As Series
    Dim weekNum As Long
    Dim lastDataRow As Long

    Set ws = ThisWorkbook.Sheets("Line chart_nights")

    ' Get the new week number from N1
    weekNum = ws.Range("N1").Value

    ' Calculate the last data row (header is row 1, so week 1 = row 2)
    lastDataRow = weekNum + 1

    ' Find the chart
    For Each cht In ws.ChartObjects
        If cht.Name = "Airbnb Weekly Nights Booked" Or _
           InStr(cht.Chart.ChartTitle.Text, "Airbnb Weekly Nights") > 0 Then

            ' Update the 2026 series (Column I)
            For Each ser In cht.Chart.SeriesCollection
                If ser.Name = "2026" Then
                    ' Update the series values to include new week
                    ' Column I = 2026 data, starting from row 2
                    ser.Values = ws.Range("I2:I" & lastDataRow)
                    ser.XValues = ws.Range("A2:A" & lastDataRow)
                    Exit For
                End If
            Next ser

            Exit For
        End If
    Next cht

    MsgBox "Chart updated to include Week " & weekNum & " (Row " & lastDataRow & ")", vbInformation
End Sub

' Alternative: Auto-run when workbook opens or N1 changes
' Add this to ThisWorkbook module if you want automatic updates:
'
' Private Sub Workbook_SheetChange(ByVal Sh As Object, ByVal Target As Range)
'     If Sh.Name = "Line chart_nights" And Not Intersect(Target, Sh.Range("N1")) Is Nothing Then
'         Call UpdateWeeklyChart
'     End If
' End Sub
